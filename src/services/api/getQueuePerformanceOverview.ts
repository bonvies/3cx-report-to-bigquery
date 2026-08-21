import describeError from '@/util/describeError.js';
import type { QueuePerformanceOverviewRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportQueuePerformanceOverview/Pbx.GetQueuePerformanceOverviewData';

// R-07 佇列績效總覽的分機明細端點。對齊官方 x-api $metadata 的函式簽章：
// periodFrom/periodTo/queueDns/waitInterval，跟其他 Queue Performance 系列 API 同一個坑，參數順序敏感。
// queueDns=''（空字串）已實測確認代表「所有佇列」，一次呼叫就拿到全部佇列的分機明細（1428 筆，
// 跟先呼叫 GetQueuePerformanceTotalsData 抓佇列清單、再逐一迴圈呼叫這支的結果完全一致）——
// 不需要 Totals 那支 API，原本的兩步驟組裝邏輯已經拿掉。waitInterval='0:00:0' 沿用其他報表慣例。
const path = (queueDn: string, sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},queueDns='${queueDn}',waitInterval='0:00:0')`;

const PAGE_SIZE = 1000;

export async function getQueuePerformanceOverview(
  queueDn: string,
  sinceIso: string,
  untilIso: string,
): Promise<QueuePerformanceOverviewRecord[]> {
  try {
    const records: QueuePerformanceOverviewRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: QueuePerformanceOverviewRecord[] }>(
        path(queueDn, sinceIso, untilIso),
        { params: { $top: PAGE_SIZE, $skip: skip } },
      );
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Queue Performance Overview request failed: ${describeError(error)}`);
  }
}
