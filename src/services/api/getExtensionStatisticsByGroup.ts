import describeError from '@/util/describeError.js';
import type { ExtensionStatisticsByGroupRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportExtensionStatisticsByGroup/Pbx.GetExtensionStatisticsByGroupData';

// 實際端點是 ReportExtensionStatisticsByGroup/Pbx.GetExtensionStatisticsByGroupData，不是原本猜的
// ReportExtensionStatistics/Pbx.GetExtensionStatisticsData——那支不管參數怎麼調一律 500，用 R-12
// 的端點做 sanity check 排除是 token/連線問題後，判斷是這支 API 本身在這台 3CX 上壞了或沒授權，
// 跟網頁真實請求核對後才找到這支能動的替代端點。
// 對齊官方 x-api $metadata 的函式簽章：groupNumber/periodFrom/periodTo/callArea，順序敏感。
// groupNumber 是部門代碼（不是分機號碼），跟 R-03/R-10 同一種坑但更隱蔽：groupNumber=''（空字串）
// 不會 404，會回 200 但 value 是空陣列，看起來像「這段時間沒資料」，其實是「這個部門代碼不存在」。
// 目前暫時寫死 'GRP0000'（已跟網頁真實請求核對確認可行），只涵蓋這一個部門，待跟 PM 確認完整部門
// 清單後再改成迴圈抓全部部門（見 REPORTS_TODO.md）。
// callArea 固定用 0（全部）——理由跟 R-15/R-16 一樣：Inbound/OutboundAnsweredCount 是彙總數字，
// 沒有欄位可以事後篩選出「是不是外線」，用 0 才能拿到完整資料。
const GROUP_NUMBER = 'GRP0000';

const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(groupNumber='${GROUP_NUMBER}',periodFrom=${sinceIso},periodTo=${untilIso},callArea=0)`;

const PAGE_SIZE = 1000;

export async function getExtensionStatisticsByGroup(sinceIso: string, untilIso: string): Promise<ExtensionStatisticsByGroupRecord[]> {
  try {
    const records: ExtensionStatisticsByGroupRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: ExtensionStatisticsByGroupRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Extension Statistics request failed: ${describeError(error)}`);
  }
}
