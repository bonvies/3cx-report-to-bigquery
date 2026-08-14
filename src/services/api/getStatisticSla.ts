import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type StatisticSlaRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportStatisticSla/Pbx.GetStatisticSlaData';

// 對齊 3CX 網頁報表送出的請求：queueDnStr/startDt/endDt/waitInterval 都是必填。
// queueDnStr=''（空字串）代表「所有 queue」，跟 GetQueueCallbacksData 一樣的怪癖，已驗證可行。
// waitInterval='0:00:0' 是預設值（不分桶），已驗證可行。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso},waitInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getStatisticSla(sinceIso: string, untilIso: string): Promise<StatisticSlaRecord[]> {
  try {
    const records: StatisticSlaRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: StatisticSlaRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Statistic SLA request failed: ${describeError(error)}`);
  }
}
