import describeError from '@/util/describeError.js';
import type { AbandonedQueueCallRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportAbandonedQueueCalls/Pbx.GetAbandonedQueueCallsData';

// 對齊 3CX 網頁報表送出的請求：periodFrom/periodTo/queueDns/waitInterval 都是必填。
// waitInterval='0:00:0' 是預設值（不分桶）。

// TODO queueDns 暫時寫死 '0336'，之後跟 PM 確認實際要涵蓋哪些 queue 分機號碼再回來改。
const queueDns = ['0336'];

const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},queueDns='${queueDns.join(' ')}',waitInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getAbandonedQueueCalls(sinceIso: string, untilIso: string): Promise<AbandonedQueueCallRecord[]> {
  try {
    const records: AbandonedQueueCallRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: AbandonedQueueCallRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Abandoned Queue Calls request failed: ${describeError(error)}`);
  }
}
