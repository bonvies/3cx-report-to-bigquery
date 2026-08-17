import describeError from '@/util/describeError.js';
import type { AgentsInQueueStatisticsRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportAgentsInQueueStatistics/Pbx.GetAgentsInQueueStatisticsData';

// 跟 Abandoned Queue Calls 一樣的怪癖：queueDnStr='' 代表「所有 queue」在這支 API 不成立，
// 一定要帶實際存在的 queue 分機號碼，否則回 404。
// TODO queueDnStr 暫時寫死 '0336'，之後跟 PM 確認實際要涵蓋哪些 queue 分機號碼再回來改。
const queueDns = ['0336'];

// 對齊 3CX 網頁報表送出的請求：queueDnStr/startDt/endDt/waitInterval 都是必填。
// waitInterval='0:00:0' 是預設值（不分桶），已驗證可行。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(queueDnStr='${queueDns.join(' ')}',startDt=${sinceIso},endDt=${untilIso},waitInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getAgentsInQueueStatistics(sinceIso: string, untilIso: string): Promise<AgentsInQueueStatisticsRecord[]> {
  try {
    const records: AgentsInQueueStatisticsRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: AgentsInQueueStatisticsRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Agents In Queue Statistics request failed: ${describeError(error)}`);
  }
}
