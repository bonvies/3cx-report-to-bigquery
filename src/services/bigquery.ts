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

  // 很多報表回來的是區間彙總數字，本身沒有時間戳（例如 Queue Callbacks 只是每個 queue 的計數）——
  // 幫每一列蓋上這次同步的時間區間，這樣不同次執行寫進 BigQuery 的資料才能分得出來。
  const enriched = records.map((record) => ({
    ...record,
    PeriodFrom: period.from,
    PeriodTo: period.to,
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
