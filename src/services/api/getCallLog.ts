import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type CallLogRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportCallLogData/Pbx.GetCallLogData'

// 對齊 3CX 網頁報表送出的請求：sourceType/destinationType/callsType/
// callTimeFilterType=0 代表「不篩選」，callTimeFilterFrom/To='0:00:0' 代表「一整天」，
// hidePcalls=true 是報表的預設值（隱藏 parking/pickup 的 "P-calls"）。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},sourceType=0,sourceFilter='',destinationType=0,destinationFilter='',callsType=0,callTimeFilterType=0,callTimeFilterFrom='0:00:0',callTimeFilterTo='0:00:0',hidePcalls=true)`;

const PAGE_SIZE = 1000;

// Recordings 這欄位似乎跟 PBX 端的某個設定/版本有關 —— 目前只有我們自己的 3CX 會回傳，
// 客戶的 3CX 沒有這個欄位，代表欄位存不存在並不固定。BigQuery table 也沒有對應欄位，
// 為避免欄位時有時無造成 insert 失敗，直接濾掉這個 key，先不寫進 BigQuery。
function omitRecordings(record: CallLogRecord): CallLogRecord {
  const { Recordings, ...rest } = record;
  return rest;
}

export async function getCallLog(sinceIso: string, untilIso: string): Promise<CallLogRecord[]> {
  try {
    const records: CallLogRecord[] = [];
    let skip = 0;

    // Call Log 是逐筆通話清單，不像其他報表是按 queue 彙總的聚合數字 —— 區間拉長很容易超過一頁，
    // 所以用 $top/$skip 一直翻頁，直到拿到不滿一頁的結果為止。
    while (true) {
      const response = await axios3CXInstance.get<{ value: CallLogRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page.map(omitRecordings));

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Call Log request failed: ${describeError(error)}`);
  }
}
