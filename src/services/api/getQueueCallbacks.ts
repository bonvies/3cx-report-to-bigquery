import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueCallbackRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueCallbacks/Pbx.GetQueueCallbacksData'

export async function getQueueCallbacks(sinceIso: string, untilIso: string): Promise<QueueCallbackRecord[]> {
  try {
    // queueDnStr=''（空字串）代表「所有 queue」—— 直接帶不加引號的 OData `null`
    // 會被 3CX 拒絕，回「The queueDnStr field is required.」。
    const path = `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso})`;
    const response = await axios3CXInstance.get<{ value: QueueCallbackRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Queue Callbacks request failed: ${describeError(error)}`);
  }
}
