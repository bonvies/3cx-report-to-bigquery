import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type StatisticSlaRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportStatisticSla/Pbx.GetStatisticSlaData'

export async function getStatisticSla(sinceIso: string, untilIso: string): Promise<StatisticSlaRecord[]> {
  try {
    // queueDnStr='' 和 waitInterval='' 代表「所有 queue / 預設分桶」——跟
    // GetQueueCallbacksData 一樣要帶引號空字串的怪癖，這兩個欄位 3CX 都是必填。
    const path = `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso},waitInterval='')`;
    const response = await axios3CXInstance.get<{ value: StatisticSlaRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Statistic SLA request failed: ${describeError(error)}`);
  }
}
