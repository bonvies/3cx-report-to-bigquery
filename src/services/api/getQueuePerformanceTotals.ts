import describeError from '@/util/describeError.js';
import type { QueuePerformanceTotalsRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportQueuePerformanceTotals/Pbx.GetQueuePerformanceTotalsData';

// 對齊 3CX 網頁報表送出的請求：periodFrom/periodTo/queueDns/waitInterval 都是必填。
// queueDns=''（空字串）代表「所有 queue」，已驗證可行。waitInterval='0:00:0' 是預設值（不分桶），已驗證可行。
// 這支 API 對參數順序敏感——實測發現 queueDns 排在 periodFrom/periodTo 前面會回 404，
// 一定要照這裡的順序（跟網頁報表送出的請求一致），其他報表都沒遇過這個問題。
const path = (periodFrom: string, periodTo: string) =>
  `${endpoint}(periodFrom=${periodFrom},periodTo=${periodTo},queueDns='',waitInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getQueuePerformanceTotals(periodFrom: string, periodTo: string): Promise<QueuePerformanceTotalsRecord[]> {
  try {
    const records: QueuePerformanceTotalsRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: QueuePerformanceTotalsRecord[] }>(path(periodFrom, periodTo), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Queue Performance Totals request failed: ${describeError(error)}`);
  }
}
