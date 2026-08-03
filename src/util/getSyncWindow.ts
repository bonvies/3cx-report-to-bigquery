export const SYNC_WINDOW_UNITS = ['minute', 'hour', 'day', 'week', 'month', 'year'] as const;
export type SyncWindowUnit = (typeof SYNC_WINDOW_UNITS)[number];

interface GetSyncWindowOptions {
  unit: SyncWindowUnit;
  amount: number;
  // When both are set, they take priority over unit/amount — used for one-off backfills.
  customSince?: string;
  customUntil?: string;
}

export default function getSyncWindow({
  unit,
  amount,
  customSince,
  customUntil,
}: GetSyncWindowOptions): { since: Date; until: Date } {
  if (customSince && customUntil) {
    return { since: new Date(customSince), until: new Date(customUntil) };
  }

  const until = new Date();
  const since = new Date(until);

  switch (unit) {
    case 'minute':
      since.setMinutes(since.getMinutes() - amount);
      break;
    case 'hour':
      since.setHours(since.getHours() - amount);
      break;
    case 'day':
      since.setDate(since.getDate() - amount);
      break;
    case 'week':
      since.setDate(since.getDate() - amount * 7);
      break;
    case 'month':
      since.setMonth(since.getMonth() - amount);
      break;
    case 'year':
      since.setFullYear(since.getFullYear() - amount);
      break;
  }

  return { since, until };
}
