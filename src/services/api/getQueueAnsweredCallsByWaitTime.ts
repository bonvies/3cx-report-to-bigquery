import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type QueueAnsweredCallsByWaitTimeRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportQueueAnsweredCallsByWaitTime/Pbx.GetQueueAnsweredCallsByWaitTimeData';

// 對齊 3CX 網頁報表送出的請求：queueDnStr/startDt/endDt/answerInterval 都是必填。
// answerInterval='0:00:0' 是預設值（不分桶）。
// queueDnStr 暫時寫死 '0336'，之後跟 PM 確認實際要涵蓋哪些 queue 分機號碼再回來改。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(queueDnStr='0336',startDt=${sinceIso},endDt=${untilIso},answerInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getQueueAnsweredCallsByWaitTime(sinceIso: string, untilIso: string): Promise<QueueAnsweredCallsByWaitTimeRecord[]> {
  try {
    const records: QueueAnsweredCallsByWaitTimeRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: QueueAnsweredCallsByWaitTimeRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Queue Answered Calls By Wait Time request failed: ${describeError(error)}`);
  }
}
