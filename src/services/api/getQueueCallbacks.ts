import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueCallbackRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueCallbacks/Pbx.GetQueueCallbacksData';

// queueDnStr=''（空字串）代表「所有 queue」—— 直接帶不加引號的 OData `null`
// 會被 3CX 拒絕，回「The queueDnStr field is required.」。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso})`;

const PAGE_SIZE = 1000;

export async function getQueueCallbacks(sinceIso: string, untilIso: string): Promise<QueueCallbackRecord[]> {
  try {
    const records: QueueCallbackRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: QueueCallbackRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Queue Callbacks request failed: ${describeError(error)}`);
  }
}
