import 'dotenv/config';
import { SYNC_PRESETS, type SyncPreset } from './util/getSyncWindow.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function syncPreset(): SyncPreset {
  const value = required('PERIOD_PRESET');
  if (!SYNC_PRESETS.includes(value as SyncPreset)) {
    throw new Error(`Invalid PERIOD_PRESET: ${value} (expected one of ${SYNC_PRESETS.join(', ')})`);
  }
  return value as SyncPreset;
}

export const config = {
  reportType: required('REPORT_TYPE'),
  threeCx: {
    baseUrl: required('BASE_URL_3CX'),
    clientId: required('CLIENT_ID_3CX'),
    clientSecret: required('CLIENT_SECRET_3CX'),
  },
  bigquery: {
    projectId: required('BQ_PROJECT_ID'),
    dataset: required('BQ_DATASET'),
    // Table 名稱跟 REPORT_TYPE 1:1 對應 —— 要用完全一樣的名稱建 BigQuery table。
    table: required('REPORT_TYPE'),
    // 選填。google-auth-library 本來就會自動讀 process.env.GOOGLE_APPLICATION_CREDENTIALS，
    // 這裡顯式帶出來只是讓 bigquery.ts 的認證來源看得到、不用去猜隱性行為；留空則走 ADC 後援機制。
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  },
  sync: {
    // 業務時區 — 除 custom 外的 preset 都是以這個時區的乾淨邊界為準，預設 Asia/Taipei
    timeZone: process.env.SITE_TIMEZONE ?? 'Asia/Taipei',
    // 比照 3CX 網頁報表的快速選項（today/yesterday/lastWeek...），必填、沒有預設值
    preset: syncPreset(),
    // preset 為 custom 時才會用到
    customPeriodFrom: process.env.PERIOD_FROM || undefined,
    customPeriodTo: process.env.PERIOD_TO || undefined,
  },
};
