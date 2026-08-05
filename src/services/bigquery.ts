import { BigQuery } from '@google-cloud/bigquery';
import { config } from '@/config.js';

const bigquery = new BigQuery({ projectId: config.bigquery.projectId });

function isPartialFailureError(error: unknown): error is { errors: unknown } {
  return typeof error === 'object' && error !== null && 'errors' in error;
}

export async function insertRecords(
  records: Record<string, unknown>[],
  period: { from: string; to: string },
): Promise<void> {
  if (records.length === 0) return;

  // Many reports return period aggregates with no timestamp of their own (e.g. Queue Callbacks
  // is just per-queue counts) — stamp every row with the sync window so rows from different
  // runs stay distinguishable in BigQuery.
  const enriched = records.map((record) => ({
    ...record,
    SyncPeriodFrom: period.from,
    SyncPeriodTo: period.to,
  }));

  const table = bigquery.dataset(config.bigquery.dataset).table(config.bigquery.table);

  try {
    await table.insert(enriched, { skipInvalidRows: false, ignoreUnknownValues: false });
  } catch (error) {
    if (isPartialFailureError(error)) {
      console.error(JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }
}
