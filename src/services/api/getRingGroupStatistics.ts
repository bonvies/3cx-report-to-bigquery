import describeError from '@/util/describeError.js';
import type { RingGroupStatisticsRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportRingGroupStatistics/Pbx.GetRingGroupStatisticsData';

// 對齊官方 x-api $metadata 的函式簽章：periodFrom/periodTo/ringGroupDns 都是必填。
// ringGroupDns=''（空字串）代表「所有響鈴群組」，已跟網頁真實請求核對確認可行。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},ringGroupDns='')`;

const PAGE_SIZE = 1000;

export async function getRingGroupStatistics(sinceIso: string, untilIso: string): Promise<RingGroupStatisticsRecord[]> {
  try {
    const records: RingGroupStatisticsRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: RingGroupStatisticsRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Ring Group Statistics request failed: ${describeError(error)}`);
  }
}
