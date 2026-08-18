import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/config.js';
import describeError from '@/util/describeError.js';
import type { CallDistributionRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportCallDistribution/Pbx.GetCallDistribution';

// 跟 R-15 GetUserActivity 同一個函式家族，簽章一致（已用 curl 對 $metadata 確認）：
// clientTimeZone/periodFrom/periodTo/groupNumber/extensionDns/waitInterval/includeQueueCalls/callArea/groupingType。
// 回傳的是依時間區段分桶的彙總計數（DateTimeInterval/OutgoingCount/IncomingCount），不是逐筆通話清單。
// clientTimeZone 用 UTC 偏移量字串（例如 '+08:00'），沿用跟 R-11/R-15 一致的寫法。
// groupNumber/extensionDns=''（空字串）代表不篩選；waitInterval='0:00:0' 沿用其他報表慣例。
// callArea 固定用 0（全部）——跟 R-15 同樣的理由：OutgoingCount/IncomingCount 是分桶後的彙總數字，
// 沒有方向欄位可以事後篩選，用 0 才能拿到完整資料。groupingType=0（Hour-By-Hour）、
// includeQueueCalls=true 沿用 R-15 已驗證可行的預設值，還沒跟這張報表自己的網頁畫面核對過。
const path = (sinceIso: string, untilIso: string) => {
  const clientTimeZone = formatInTimeZone(new Date(), config.sync.timeZone, 'xxx');
  return `${endpoint}(clientTimeZone='${clientTimeZone}',periodFrom=${sinceIso},periodTo=${untilIso},groupNumber='',extensionDns='',waitInterval='0:00:0',includeQueueCalls=true,callArea=0,groupingType=0)`;
};

const PAGE_SIZE = 1000;

export async function getCallDistribution(sinceIso: string, untilIso: string): Promise<CallDistributionRecord[]> {
  try {
    const records: CallDistributionRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: CallDistributionRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Call Distribution request failed: ${describeError(error)}`);
  }
}
