import { config } from './config.js';
import { getQueueCallbacks } from './services/api/getQueueCallbacks.js';
import { getQueueAnsweredCallsByWaitTime } from './services/api/getQueueAnsweredCallsByWaitTime.js';
import { getStatisticSla } from './services/api/getStatisticSla.js';
import { getCallLog } from './services/api/getCallLog.js';
import { getInboundRules } from './services/api/getInboundRules.js';
import { getAbandonedQueueCalls } from './services/api/getAbandonedQueueCalls.js';
import { getQueuePerformanceTotals } from './services/api/getQueuePerformanceTotals.js';
import { getDetailedQueueStatistics } from './services/api/getDetailedQueueStatistics.js';
import { getTeamQueueGeneralStatistics } from './services/api/getTeamQueueGeneralStatistics.js';
import { getAgentsInQueueStatistics } from './services/api/getAgentsInQueueStatistics.js';
import { getAgentLoginHistory } from './services/api/getAgentLoginHistory.js';
import { getRingGroupStatistics } from './services/api/getRingGroupStatistics.js';
import { getInboundCalls } from './services/api/getInboundCalls.js';
import { getOutboundCalls } from './services/api/getOutboundCalls.js';
import { insertRecords } from './services/bigquery.js';
import getSyncWindow from './util/getSyncWindow.js';

async function main() {
  try {
    const { periodFrom, periodTo } = getSyncWindow({
      preset: config.sync.preset,
      timeZone: config.sync.timeZone,
      customPeriodFrom: config.sync.customPeriodFrom,
      customPeriodTo: config.sync.customPeriodTo,
    });

    console.log(`PERIOD_PRESET: ${config.sync.preset}`);
    console.log(`Running report "${config.reportType}" from ${periodFrom.toISOString()} to ${periodTo.toISOString()}`);

    switch (config.reportType) {
      // R-01 通話日誌 Call Log
      case 'callLog': {
        const records = await getCallLog(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Call Log records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-02 進線規則 Inbound Rules
      case 'inboundRules': {
        const records = await getInboundRules();
        console.log(`Fetched ${records.length} Inbound Rule records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-03 放棄的佇列呼叫 Abandoned Queue Calls
      case 'abandonedQueueCalls': {
        const records = await getAbandonedQueueCalls(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Abandoned Queue Call records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-04 佇列接聽呼叫依等待時間 Queue Answered Calls By Wait Time
      case 'queueAnsweredCallsByWaitTime': {
        const records = await getQueueAnsweredCallsByWaitTime(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Queue Answered Calls By Wait Time records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-05 佇列回撥 Queue Callbacks
      case 'queueCallbacks': {
        const records = await getQueueCallbacks(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Queue Callback records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-06 SLA 統計 Statistic SLA
      case 'statisticSla': {
        const records = await getStatisticSla(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Statistic SLA records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-07 佇列績效總覽 Queue Performance Overview（實際 API 是 QueuePerformanceTotals）
      case 'queuePerformanceTotals': {
        const records = await getQueuePerformanceTotals(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Queue Performance Totals records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-08 詳細佇列統計 Detailed Queue Statistics
      case 'detailedQueueStatistics': {
        const records = await getDetailedQueueStatistics(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Detailed Queue Statistics records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-09 團隊佇列總體統計 Team Queue General Statistics
      case 'teamQueueGeneralStatistics': {
        const records = await getTeamQueueGeneralStatistics(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Team Queue General Statistics records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-10 佇列專員統計 Agents in Queue Statistics
      case 'agentsInQueueStatistics': {
        const records = await getAgentsInQueueStatistics(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Agents In Queue Statistics records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-11 專員登入歷史 Agent Login History
      case 'agentLoginHistory': {
        const records = await getAgentLoginHistory(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Agent Login History records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-12 響鈴群組統計 Ring Groups
      case 'ringGroupStatistics': {
        const records = await getRingGroupStatistics(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Ring Group Statistics records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-13 進線通話報表 Inbound Call Report（U6+）
      case 'inboundCalls': {
        const records = await getInboundCalls(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Inbound Call records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
        break;
      }
      // R-14 撥出通話報表 Outbound Call Report（U6+）
      case 'outboundCalls': {
        const records = await getOutboundCalls(periodFrom.toISOString(), periodTo.toISOString());
        console.log(`Fetched ${records.length} Outbound Call records`);

        const inserted = await insertRecords(records, { from: periodFrom.toISOString(), to: periodTo.toISOString() });
        if (inserted) {
          console.log(`Inserted ${records.length} records into ${config.bigquery.dataset}.${config.bigquery.table}`);
        }
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
