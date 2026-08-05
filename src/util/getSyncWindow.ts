import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns';

export const SYNC_WINDOW_UNITS = ['minute', 'hour', 'day', 'week', 'month', 'year'] as const;
export type SyncWindowUnit = (typeof SYNC_WINDOW_UNITS)[number];

interface GetSyncWindowOptions {
  unit: SyncWindowUnit;
  amount: number;
  // 業務時區（例如 Asia/Taipei）— day/week/month/year 的「乾淨邊界」要以這個時區的牆上時鐘為準，
  // 而不是 UTC 的午夜，不然台北的一整天在 UTC 看起來會被切在中午。
  timeZone: string;
  // 兩者同時提供時優先於 unit/amount，用於一次性補資料（backfill）。
  customSince?: string;
  customUntil?: string;
}

// 每個單位對應的「捨去到起點」函式（來自 date-fns）
const startOfUnit: Record<SyncWindowUnit, (date: Date) => Date> = {
  minute: startOfMinute,
  hour: startOfHour,
  day: startOfDay,
  week: startOfWeek, // 預設週日為一週的第一天
  month: startOfMonth,
  year: startOfYear,
};

// 每個單位對應的「往前推 N 個單位」函式（來自 date-fns）
const subUnit: Record<SyncWindowUnit, (date: Date, amount: number) => Date> = {
  minute: subMinutes,
  hour: subHours,
  day: subDays,
  week: subWeeks,
  month: subMonths,
  year: subYears,
};

export default function getSyncWindow({
  unit,
  amount,
  timeZone,
  customSince,
  customUntil,
}: GetSyncWindowOptions): { since: Date; until: Date } {
  // 有指定自訂區間時，直接採用，不套用 unit/amount 的推算邏輯
  if (customSince && customUntil) {
    return { since: new Date(customSince), until: new Date(customUntil) };
  }

  // toZonedTime 把「現在」投影成業務時區的牆上時鐘時間，
  // 這樣 date-fns 的 startOf*/sub* 才能用該時區的日期邊界計算，
  // 而不是伺服器所在時區或 UTC 的邊界。
  const zonedNow = toZonedTime(new Date(), timeZone);
  const zonedUntil = startOfUnit[unit](zonedNow);
  const zonedSince = subUnit[unit](zonedUntil, amount);

  // fromZonedTime 把「業務時區的牆上時鐘時間」還原成真實的 UTC 時間點
  return {
    since: fromZonedTime(zonedSince, timeZone),
    until: fromZonedTime(zonedUntil, timeZone),
  };
}
