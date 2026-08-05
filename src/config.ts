import 'dotenv/config';
import { SYNC_WINDOW_UNITS, type SyncWindowUnit } from './util/getSyncWindow.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function syncWindowUnit(): SyncWindowUnit {
  const value = process.env.SYNC_LOOKBACK_UNIT ?? 'day';
  if (!SYNC_WINDOW_UNITS.includes(value as SyncWindowUnit)) {
    throw new Error(`Invalid SYNC_LOOKBACK_UNIT: ${value} (expected one of ${SYNC_WINDOW_UNITS.join(', ')})`);
  }
  return value as SyncWindowUnit;
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
    // Table name matches REPORT_TYPE 1:1 — create a BigQuery table with that exact name.
    table: required('REPORT_TYPE'),
  },
  sync: {
    lookbackUnit: syncWindowUnit(),
    lookbackAmount: Number(process.env.SYNC_LOOKBACK_AMOUNT ?? 1),
    // Explicit backfill range — when both are set, they override lookbackUnit/lookbackAmount.
    customSince: process.env.SYNC_SINCE_3CX || undefined,
    customUntil: process.env.SYNC_UNTIL_3CX || undefined,
  },
};
