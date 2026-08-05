import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueAnsweredCallsByWaitTimeRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueAnsweredCallsByWaitTime/Pbx.GetQueueAnsweredCallsByWaitTimeData'

export async function getQueueAnsweredCallsByWaitTime(sinceIso: string, untilIso: string): Promise<QueueAnsweredCallsByWaitTimeRecord[]> {
  try {
    // queueDnStr='' 和 answerInterval='' 代表「所有 queue / 預設分桶」——跟
    // GetQueueCallbacksData 一樣要帶引號空字串的怪癖，這兩個欄位 3CX 都是必填。
    const path = `${endpoint}(queueDnStr='',startDt=${sinceIso},endDt=${untilIso},answerInterval='')`;
    const response = await axios3CXInstance.get<{ value: QueueAnsweredCallsByWaitTimeRecord[] }>(path);

    return response.data.value ?? [];
  } catch (error) {
    throw new Error(`3CX Queue Answered Calls By Wait Time request failed: ${describeError(error)}`);
  }
}
