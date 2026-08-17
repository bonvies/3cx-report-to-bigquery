import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/config.js';
import describeError from '@/util/describeError.js';
import type { AgentLoginHistoryRecord } from '@/types/apiType.js';
import { axios3CXInstance } from './connectToken.js';

const endpoint = '/xapi/v1/ReportAgentLoginHistory/Pbx.GetAgentLoginHistoryData';

// 對齊官方文件的函式簽章：clientTimeZone/startDt/endDt/queueDnStr/agentDnStr 都是必填，且順序敏感
// （R-07 教訓：這系列 API 部分端點對參數順序敏感，404 不代表參數名稱錯，可能只是順序不對）。
// clientTimeZone 不是 IANA 時區名稱——實測過 'Asia/Taipei' 直接 404，要傳 UTC 偏移量字串（例如
// '+08:00'），這裡用 date-fns-tz 從 SITE_TIMEZONE 換算，不寫死，避免時區設定改了這裡忘記同步改。
// queueDnStr=''/agentDnStr=''（空字串）代表「所有 queue / 所有專員」，已驗證可行。
const path = (sinceIso: string, untilIso: string) => {
  const clientTimeZone = formatInTimeZone(new Date(), config.sync.timeZone, 'xxx');
  return `${endpoint}(clientTimeZone='${clientTimeZone}',startDt=${sinceIso},endDt=${untilIso},queueDnStr='',agentDnStr='')`;
};

const PAGE_SIZE = 1000;

export async function getAgentLoginHistory(sinceIso: string, untilIso: string): Promise<AgentLoginHistoryRecord[]> {
  try {
    const records: AgentLoginHistoryRecord[] = [];
    let skip = 0;

    while (true) {
      const response = await axios3CXInstance.get<{ value: AgentLoginHistoryRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Agent Login History request failed: ${describeError(error)}`);
  }
}
