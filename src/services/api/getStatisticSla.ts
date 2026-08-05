import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type StatisticSlaRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportStatisticSla/Pbx.GetStatisticSlaData'

export async function getStatisticSla(sinceIso: string, untilIso: string): Promise<StatisticSlaRecord[]> {
  try {
    // queueDnStr='' and waitInterval='' mean "all queues / default bucketing" — same
    // quoted-empty-string quirk as GetQueueCallbacksData; both fields are required by 3CX.
    const path = `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso},waitInterval='')`;
    const response = await axios3CXInstance.get<{ value: StatisticSlaRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Statistic SLA request failed: ${describeError(error)}`);
  }
}
