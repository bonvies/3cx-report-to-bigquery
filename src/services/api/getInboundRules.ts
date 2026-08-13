import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type InboundRuleRecord = {
  [key: string]: unknown;
};

type Destination = {
  External?: string;
  Name?: string;
  Number?: string;
  Tags?: string[];
  To?: string;
  Type?: string;
};

const endpoint = '/xapi/v1/ReportInboundRules/Pbx.GetInboundRulesData()';

// GetInboundRulesData 的 $top 上限是 100（實測跳出 "The limit of '100' for Top query has been
// exceeded" 錯誤），跟 Call Log 那支 API 可以到 1000 不一樣，每支 API 的分頁上限要個別實測確認。
const PAGE_SIZE = 100;

// InOfficeRouting/OutOfficeRouting 是巢狀物件（見 x-api.yaml 的 Pbx.Destination），BigQuery 這邊
// 一律扁平化存放（比照這個專案其他報表的做法，不用巢狀 STRUCT）—— 攤平成 InOfficeRouting_To/
// _Number/_Name/_Type/_External 這幾個欄位，Tags 是字串陣列，合併成逗號分隔的字串存放。
// 有些規則（例如 To: "None"）底下完全沒有 Number/Name/Type/External，用 optional chaining 補 null。
function flattenDestination(prefix: string, destination: Destination | null | undefined): Record<string, unknown> {
  return {
    [`${prefix}_To`]: destination?.To ?? null,
    [`${prefix}_Number`]: destination?.Number ?? null,
    [`${prefix}_Name`]: destination?.Name ?? null,
    [`${prefix}_Type`]: destination?.Type ?? null,
    [`${prefix}_External`]: destination?.External ?? null,
    [`${prefix}_Tags`]: destination?.Tags && destination.Tags.length > 0 ? destination.Tags.join(',') : null,
  };
}

function flattenRecord(record: InboundRuleRecord): InboundRuleRecord {
  const { InOfficeRouting, OutOfficeRouting, ...rest } = record;
  return {
    ...rest,
    ...flattenDestination('InOfficeRouting', InOfficeRouting as Destination | undefined),
    ...flattenDestination('OutOfficeRouting', OutOfficeRouting as Destination | undefined),
  };
}

// GetInboundRulesData 沒有 periodFrom/periodTo 參數 —— 這是目前設定的快照，不是某段時間內發生的事件，
// 不管什麼時候查都是回傳「現在」的進線規則，呼叫端仍會另外蓋上 PeriodFrom/PeriodTo 標記這次快照的時間點。
export async function getInboundRules(): Promise<InboundRuleRecord[]> {
  try {
    const records: InboundRuleRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: InboundRuleRecord[] }>(endpoint, {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page.map(flattenRecord));

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Inbound Rules request failed: ${describeError(error)}`);
  }
}
