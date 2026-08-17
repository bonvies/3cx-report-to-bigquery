import describeError from '@/util/describeError.js';
import type { InboundCallRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportInboundCalls/Pbx.GetInboundCalls';

// 對齊官方 x-api $metadata 的函式簽章：periodFrom/periodTo/trunkDns/callsType 都是必填。
// trunkDns=''（空字串）代表「所有 trunk」，callsType=0 比照 Call Log 代表「不篩選」，都已跟網頁
// 真實請求核對確認可行。
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},trunkDns='',callsType=0)`;

const PAGE_SIZE = 1000;

export async function getInboundCalls(sinceIso: string, untilIso: string): Promise<InboundCallRecord[]> {
  try {
    const records: InboundCallRecord[] = [];
    let skip = 0;

    // 逐筆通話清單（不是彙總數字），區間拉長很容易超過一頁，跟 Call Log 一樣用 $top/$skip 一直翻頁。
    while (true) {
      const response = await axios3CXInstance.get<{ value: InboundCallRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Inbound Calls request failed: ${describeError(error)}`);
  }
}
