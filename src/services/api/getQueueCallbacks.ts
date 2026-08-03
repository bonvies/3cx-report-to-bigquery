import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueCallbackRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueCallbacks/Pbx.GetQueueCallbacksData'

export async function getQueueCallbacks(sinceIso: string, untilIso: string): Promise<QueueCallbackRecord[]> {
  try {
    const path = `${endpoint}(queueDnStr=null,startDt=${sinceIso},endDt=${untilIso})`;
    const response = await axios3CXInstance.get<{ value: QueueCallbackRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Queue Callbacks request failed: ${describeError(error)}`);
  }
}
