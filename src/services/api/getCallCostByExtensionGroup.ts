import describeError from '@/util/describeError.js';
import type { CallCostByExtensionGroupRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportCallCostByExtensionGroup/Pbx.GetCallCostByExtensionGroupData';

// 對齊官方 x-api $metadata 的函式簽章（已用 curl 對 $metadata 確認）：
// periodFrom/periodTo/groupFilter/callClass，順序敏感。
// groupFilter 跟 R-17 的 groupNumber 同一個坑：groupFilter=''（空字串）不會 404，會回 200 但
// value 是空陣列，看起來像「這段時間沒資料」，其實是「這個部門代碼不存在」。目前暫時寫死
// 'GRP0000'（已用 curl 驗證可行，回傳 GroupName 是 "__DEFAULT__"），只涵蓋這一個部門，
// 待跟 PM 確認完整部門清單後再改成迴圈抓全部部門（見 REPORTS_TODO.md，跟 R-17 同樣的權宜作法）。
// callClass 目前用 0，還沒跟網頁真實請求核對過（這支報表沒有明顯對應的 3CX 網頁畫面）。
// 逐筆通話清單（不是彙總數字），跟 Call Log/Inbound Calls/Outbound Calls 同一種性質，用 $top/$skip 翻頁。
// BillingCost 已實測會有非零值（即使 CallType 顯示 "Not Configured"），代表底層計費引擎本身
// 是有在運作的，不是因為 /CallCostSettings 沒設定費率就整批是 0（前提條件已用 curl 確認過）。
const GROUP_FILTER = 'GRP0000';

const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},groupFilter='${GROUP_FILTER}',callClass=0)`;

const PAGE_SIZE = 1000;

export async function getCallCostByExtensionGroup(sinceIso: string, untilIso: string): Promise<CallCostByExtensionGroupRecord[]> {
  try {
    const records: CallCostByExtensionGroupRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: CallCostByExtensionGroupRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Call Cost by Extension Dept request failed: ${describeError(error)}`);
  }
}
