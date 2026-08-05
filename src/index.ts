import { config } from './config.js';
import { getQueueCallbacks } from './services/api/getQueueCallbacks.js';
import { getQueueAnsweredCallsByWaitTime } from './services/api/getQueueAnsweredCallsByWaitTime.js';
import { getStatisticSla } from './services/api/getStatisticSla.js';
import { getCallLog } from './services/api/getCallLog.js';
import { insertRecords } from './services/bigquery.js';
import getSyncWindow from './util/getSyncWindow.js';

async function main() {
  try {
    const { since, until } = getSyncWindow({
      unit: config.sync.lookbackUnit,
      amount: config.sync.lookbackAmount,
      timeZone: config.sync.timeZone,
      customSince: config.sync.customSince,
      customUntil: config.sync.customUntil,
    });

    console.log(`Running report "${config.reportType}" from ${since.toISOString()} to ${until.toISOString()}`);

    switch (config.reportType) {
      // R-01 通話日誌 Call Log
      case 'callLog': {
        const records = await getCallLog(since.toISOString(), until.toISOString());
        console.log(`Fetched ${records.length} Call Log records`);

        await insertRecords(records, { from: since.toISOString(), to: until.toISOString() });
        console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        break;
      }
      case 'queueCallbacks': {
        const records = await getQueueCallbacks(since.toISOString(), until.toISOString());
        console.log(`Fetched ${records.length} Queue Callback records`);

        await insertRecords(records, { from: since.toISOString(), to: until.toISOString() });
        console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        break;
      }
      case 'queueAnsweredCallsByWaitTime': {
        const records = await getQueueAnsweredCallsByWaitTime(since.toISOString(), until.toISOString());
        console.log(`Fetched ${records.length} Queue Answered Calls By Wait Time records`);

        await insertRecords(records, { from: since.toISOString(), to: until.toISOString() });
        console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        break;
      }
      case 'statisticSla': {
        const records = await getStatisticSla(since.toISOString(), until.toISOString());
        console.log(`Fetched ${records.length} Statistic SLA records`);

        await insertRecords(records, { from: since.toISOString(), to: until.toISOString() });
        console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        break;
      }
      // 之後要加新的 report，就在這裡多加一個 case
      default:
        throw new Error(`Unknown REPORT_TYPE: ${config.reportType}`);
    }
  } catch (error) {
    console.error('Job failed:', error);
    process.exitCode = 1;
  }
}

main()
