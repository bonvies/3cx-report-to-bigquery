import describeError from '@/util/describeError.js';
import { axios3CXInstance } from './connectToken.js';

export type CallLogRecord = {
  [key: string]: unknown;
};

const endpoint = '/xapi/v1/ReportCallLogData/Pbx.GetCallLogData'

// Matches the request the 3CX web report sends: sourceType/destinationType/callsType/
// callTimeFilterType=0 means "no filter", callTimeFilterFrom/To='0:00:0' means "whole day",
// hidePcalls=true is the report's default (hides parking/pickup "P-calls").
const path = (sinceIso: string, untilIso: string) =>
  `${endpoint}(periodFrom=${sinceIso},periodTo=${untilIso},sourceType=0,sourceFilter='',destinationType=0,destinationFilter='',callsType=0,callTimeFilterType=0,callTimeFilterFrom='0:00:0',callTimeFilterTo='0:00:0',hidePcalls=true)`;

const PAGE_SIZE = 1000;

export async function getCallLog(sinceIso: string, untilIso: string): Promise<CallLogRecord[]> {
  try {
    const records: CallLogRecord[] = [];
    let skip = 0;

    // Call Log is a per-call list, not a per-queue aggregate like the other reports — a wide
    // date range can easily exceed one page, so keep paging with $top/$skip until a short page.
    while (true) {
      const response = await axios3CXInstance.get<{ value: CallLogRecord[] }>(path(sinceIso, untilIso), {
        params: { $top: PAGE_SIZE, $skip: skip },
      });
      const page = response.data.value ?? [];
      records.push(...page);

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return records;
  } catch (error) {
    throw new Error(`3CX Call Log request failed: ${describeError(error)}`);
  }
}
