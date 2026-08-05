import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueAnsweredCallsByWaitTimeRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueAnsweredCallsByWaitTime/Pbx.GetQueueAnsweredCallsByWaitTimeData'

export async function getQueueAnsweredCallsByWaitTime(sinceIso: string, untilIso: string): Promise<QueueAnsweredCallsByWaitTimeRecord[]> {
  try {
    // queueDnStr='' and answerInterval='' mean "all queues / default bucketing" — same
    // quoted-empty-string quirk as GetQueueCallbacksData; both fields are required by 3CX.
    const path = `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso},answerInterval='')`;
    const response = await axios3CXInstance.get<{ value: QueueAnsweredCallsByWaitTimeRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Queue Answered Calls By Wait Time request failed: ${describeError(error)}`);
  }
}
