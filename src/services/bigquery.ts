import { BigQuery } from '@google-cloud/bigquery';
import { config } from '@/config.js';

// keyFilename 為 undefined 時等同不傳 —— BigQuery 內部一樣會退回 ADC 後援機制，
// 這裡顯式帶出來純粹是讓認證來源在這個檔案裡看得到，不影響行為。
const bigquery = new BigQuery({ projectId: config.bigquery.projectId, keyFilename: config.bigquery.keyFilename });

function isPartialFailureError(error: unknown): error is { errors: unknown } {
  return typeof error === 'object' && error !== null && 'errors' in error;
}

// 去重方案：改成「先查、查到就跳過」，不覆蓋已寫入的區間資料（見 logs/DEDUP_NOTES.md）。
// 原本的「先刪再插」在正式排程改成每分鐘一次之後行不通——streaming insert 寫入的資料最長 90 分鐘內
// 卡在 streaming buffer 裡，DELETE/UPDATE/MERGE 這種 DML 動不了它（會直接報錯：
// "would affect rows in the streaming buffer, which is not supported"），一分鐘一次的頻率幾乎每次
// 都會撞到上一次還在 buffer 裡的資料。改用 SELECT 判斷「這個區間有沒有資料」則完全不受這個限制——
// SELECT 看得到 buffer 裡的資料，只有要「改動」資料的 DML 才被擋，所以查詢結果是準確的。
//
// 取捨：這個區間一旦寫入過，之後同一個區間就不會再更新——today/thisMonth/thisYear 這種「進行中的
// 區間」原本設計成一天內重跑會用更完整的資料覆蓋舊的，改成這個機制之後那個「漸進覆蓋」的行為會消失，
// 只有第一次執行會真的寫入。跨區間重疊（例如手動 backfill 撞到自動排程）一樣抓不到，人工查閱抓漏。
//
// callLog/abandonedQueueCalls/queueAnsweredCallsByWaitTime/agentLoginHistory 依各自資料本身的業務時間
// 欄位做 DAY 分區（見 logs/BIGQUERY_SETUP.md），只用 PeriodFrom/PeriodTo 篩選會導致全表掃描，要額外加一個
// 對應欄位的範圍條件才能命中分區；彙總類報表沒有自然時間欄位，PeriodFrom 本身就是分區欄位，不需要額外條件。
const PARTITION_FIELD_BY_TABLE: Partial<Record<string, string>> = {
  callLog: 'StartTime',
  abandonedQueueCalls: 'CallTime',
  queueAnsweredCallsByWaitTime: 'CallTime',
  agentLoginHistory: 'Day',
};

async function periodAlreadyInserted(period: { from: string; to: string }): Promise<boolean> {
  const { projectId, dataset, table: tableId } = config.bigquery;
  const partitionField = PARTITION_FIELD_BY_TABLE[tableId];
  const partitionClause = partitionField ? ` AND ${partitionField} BETWEEN @from AND @to` : '';

  // 傳 Date 物件、不手動宣告 types —— @google-cloud/bigquery 收到字串 + 手動宣告 types: 'TIMESTAMP'
  // 時，內部會把它當成需要 `.value` 屬性的自訂型別物件處理，字串沒有 `.value`，讀出來變成
  // undefined（等同 NULL），導致 WHERE 條件永遠比對不到任何資料。傳 Date 物件會被函式庫自動包成
  // 正確的 BigQueryTimestamp，型別也會自動推斷，才會送出真正的時間值。
  const [rows] = await bigquery.query({
    query: `SELECT 1 FROM \`${projectId}.${dataset}.${tableId}\` WHERE PeriodFrom = @from AND PeriodTo = @to${partitionClause} LIMIT 1`,
    params: { from: new Date(period.from), to: new Date(period.to) },
  });

  return rows.length > 0;
}

// 回傳這次是否真的寫入了資料，讓呼叫端印 log 時能反映實際發生的事（而不是不管有沒有寫入都印同一句）。
export async function insertRecords(
  records: Record<string, unknown>[],
  period: { from: string; to: string },
): Promise<boolean> {
  if (records.length === 0) return false;

  if (await periodAlreadyInserted(period)) {
    console.log(`Period ${period.from} to ${period.to} already has data, skip insert (duplicate write prevented)`);
    return false;
  }

  // 很多報表回來的是區間彙總數字，本身沒有時間戳（例如 Queue Callbacks 只是每個 queue 的計數）——
  // 幫每一列蓋上這次同步的時間區間，這樣不同次執行寫進 BigQuery 的資料才能分得出來。
  const enriched = records.map((record) => ({
    ...record,
    PeriodFrom: period.from,
    PeriodTo: period.to,
  }));

  const table = bigquery.dataset(config.bigquery.dataset).table(config.bigquery.table);

  try {
    await table.insert(enriched, { skipInvalidRows: false, ignoreUnknownValues: false });
  } catch (error) {
    if (isPartialFailureError(error)) {
      console.error(JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }

  return true;
}
