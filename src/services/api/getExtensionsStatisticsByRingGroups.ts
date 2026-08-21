import describeError from '@/util/describeError.js';
import type { ExtensionsStatisticsByRingGroupsRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportExtensionsStatisticsByRingGroups/Pbx.GetExtensionsStatisticsByRingGroupsData';

// R-12 響鈴群組統計改版：對齊官方 x-api $metadata 的函式簽章，periodFrom/periodTo/ringGroupDns 都是必填
// （這支沒有 waitInterval，跟原本的 GetRingGroupStatisticsData 一樣）。ringGroupDns=''（空字串）已實測
// 確認代表「所有響鈴群組」，一次呼叫就拿到全部響鈴群組+分機明細（62 筆），不需要分次查詢。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},ringGroupDns='')`;

const PAGE_SIZE = 1000;

export async function getExtensionsStatisticsByRingGroups(
  sinceIso: string,
  untilIso: string,
): Promise<ExtensionsStatisticsByRingGroupsRecord[]> {
  try {
    const records: ExtensionsStatisticsByRingGroupsRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: ExtensionsStatisticsByRingGroupsRecord[] }>(
        path(sinceIso, untilIso),
        { params: { $top: PAGE_SIZE, $skip: skip } },
      );
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Extensions Statistics by Ring Groups request failed: ${describeError(error)}`);
  }
}
