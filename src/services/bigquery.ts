import { BigQuery } from '@google-cloud/bigquery';
import { config } from '@/config.js';

const bigquery = new BigQuery({ projectId: config.bigquery.projectId });

function isPartialFailureError(error: unknown): error is { errors: unknown } {
  return typeof error === 'object' && error !== null && 'errors' in error;
}

export async function insertRecords(records: Record<string, unknown>[]): Promise<void> {
  if (records.length === 0) return;

  const table = bigquery.dataset(config.bigquery.dataset).table(config.bigquery.table);

  try {
    await table.insert(records, { skipInvalidRows: false, ignoreUnknownValues: false });
  } catch (error) {
    if (isPartialFailureError(error)) {
      console.error(JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }
}
