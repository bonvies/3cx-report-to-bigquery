import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/config.js';
import describeError from '@/util/describeError.js';
import type { UserActivityRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportUserActivity/Pbx.GetUserActivity';

// 對齊官方 x-api $metadata 的函式簽章（已用 curl 對 $metadata 確認，這系列 API 對參數順序敏感，
// 順序照 $metadata 原始順序排）：
// clientTimeZone/periodFrom/periodTo/groupNumber/extensionDns/waitInterval/includeQueueCalls/callArea/groupingType。
// clientTimeZone 這裡跟 R-11 不同：已跟網頁真實請求核對過，網頁直接傳 IANA 時區名稱
// 'Asia/Taipei' 也是 200，不是每個帶 clientTimeZone 的端點都有 R-11 那個 IANA 會 404 的坑；
// 這裡仍沿用 formatInTimeZone 轉成 UTC 偏移量字串（例如 '+08:00'），兩種格式都驗證過可行，
// 沿用偏移量寫法純粹是跟 R-11 保持一致，不是因為這裡也有 IANA 404 的問題。
// 回傳的不是逐筆通話清單，是依時間區段分桶的彙總計數（DateTimeInterval/AnsweredCount/UnansweredCount），
// 跟 R-16 Call Distribution 同一種資料形狀。
// groupNumber/extensionDns=''（空字串）比照其他報表代表「不篩選」；waitInterval='0:00:0' 沿用其他報表慣例
// （網頁實測是 '0:00:00'，兩種寫法都是合法的 TimeSpan 字串，已用我們這個寫法驗證可行）；
// includeQueueCalls=true 還沒跟網頁核對，先沿用猜測預設值。
// callArea/groupingType 已跟網頁真實請求核對過：callArea 是 Call Direction 篩選（0=全部 All，
// 1=內線 Internal，2=外線 External），這裡固定用 0（全部）——因為 AnsweredCount/UnansweredCount
// 是分桶後的彙總數字，沒有方向欄位可以事後篩選，用 0 才能拿到完整活動量，不會漏資料。
// groupingType 是時間分桶粒度（0=Hour-By-Hour，已用 24 小時區間跑出 24 桶驗證過）。
const path = (sinceIso: string, untilIso: string) => {
  const clientTimeZone = formatInTimeZone(new Date(), config.sync.timeZone, 'xxx');
  return `${endpoint}(clientTimeZone='${clientTimeZone}',periodFrom=${sinceIso},periodTo=${untilIso},groupNumber='',extensionDns='',waitInterval='0:00:0',includeQueueCalls=true,callArea=0,groupingType=0)`;
};

const PAGE_SIZE = 1000;

export async function getUserActivity(sinceIso: string, untilIso: string): Promise<UserActivityRecord[]> {
  try {
    const records: UserActivityRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: UserActivityRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX User Activity request failed: ${describeError(error)}`);
  }
}
