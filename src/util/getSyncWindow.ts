import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  addMinutes,
  subMinutes,
  addHours,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addMonths,
  addYears,
} from 'date-fns';

// 比照 3CX 網頁報表的日期選單，額外補上網頁沒有的 thisMinute/thisHour（方便驗證/除錯用短區間），
// custom 則對應網頁的 "Custom" —— 選這個時改讀 customPeriodFrom/customPeriodTo。
export const SYNC_PRESETS = [
  'custom',
  'thisMinute',
  'thisHour',
  'today',
  'yesterday',
  'last7Days',
  'lastWeek',
  'last30Days',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'lastYear',
] as const;
export type SyncPreset = (typeof SYNC_PRESETS)[number];

interface GetSyncWindowOptions {
  // 比照 3CX 網頁的「Today / Yesterday / Last week ...」快速選項。
  preset: SyncPreset;
  // 業務時區（例如 Asia/Taipei）— 除 custom 外的所有 preset 都是以這個時區的牆上時鐘去算「乾淨邊界」，
  // 而不是 UTC 的午夜，不然台北的一整天在 UTC 看起來會被切在中午。
  timeZone: string;
  // preset 為 custom 時才會用到（對應網頁的 "Custom"），用於一次性補資料（backfill）。
  customPeriodFrom?: string;
  customPeriodTo?: string;
}

// 每個 preset 對應的時間窗計算方式，輸入/輸出都是「業務時區的牆上時鐘時間」，
// 而且 now 在傳進來之前已經先 floor 到分鐘（見 getSyncWindow），所以這裡完全不會碰到秒/毫秒的殘值。
// 分兩種語意：
// - 「已結束的整個區間」(thisMinute/thisHour/yesterday/lastWeek/lastMonth/lastYear)：
//   periodFrom/periodTo 是上一個完整區間的起訖點，不包含現在 —— thisMinute/thisHour 粒度太小，
//   「目前這一分鐘/這一小時」幾乎是空的，所以跟 yesterday 等一樣採用「上一個完整區間」。
// - 「進行中的當前區間」(today/thisMonth/thisYear)：periodFrom 是區間起點，periodTo 是現在（已 floor 到分鐘），因為這段還沒結束。
// - 「包含今天的 N 個完整日期」(last7Days/last30Days)：periodTo 固定是明天 00:00（涵蓋整個今天），
//   periodFrom 是 startOfDay(now - (N-1) 天) —— 减 (N-1) 不是 N，因為今天本身要算進這 N 天裡（fence-post）。
const presetWindow: Record<Exclude<SyncPreset, 'custom'>, (now: Date) => { periodFrom: Date; periodTo: Date }> = {
  thisMinute: (now) => ({ periodFrom: startOfMinute(now), periodTo: addMinutes(startOfMinute(now), 1) }),
  thisHour: (now) => ({ periodFrom: startOfHour(now), periodTo: addHours(startOfHour(now), 1) }),
  today: (now) => ({ periodFrom: startOfDay(now), periodTo: addDays(startOfDay(now), 1) }),
  yesterday: (now) => ({ periodFrom: startOfDay(subDays(now, 1)), periodTo: startOfDay(now) }),
  last7Days: (now) => ({ periodFrom: startOfDay(subDays(now, 6)), periodTo: addDays(startOfDay(now), 1) }),
  lastWeek: (now) => ({ periodFrom: subWeeks(startOfWeek(now), 1), periodTo: startOfWeek(now) }),
  last30Days: (now) => ({ periodFrom: startOfDay(subDays(now, 29)), periodTo: addDays(startOfDay(now), 1) }),
  thisMonth: (now) => ({ periodFrom: startOfMonth(now), periodTo: addMonths(startOfMonth(now), 1) }),
  lastMonth: (now) => ({ periodFrom: startOfMonth(subMonths(now, 1)), periodTo: startOfMonth(now) }),
  thisYear: (now) => ({ periodFrom: startOfYear(now), periodTo: addYears(startOfYear(now), 1) }),
  lastYear: (now) => ({ periodFrom: startOfYear(subYears(now, 1)), periodTo: startOfYear(now) }),
};

export default function getSyncWindow({ preset, timeZone, customPeriodFrom, customPeriodTo }: GetSyncWindowOptions): {
  periodFrom: Date;
  periodTo: Date;
} {
  if (preset === 'custom') {
    if (!customPeriodFrom || !customPeriodTo) {
      throw new Error('PERIOD_PRESET=custom requires PERIOD_FROM and PERIOD_TO to be set');
    }
    return { periodFrom: new Date(customPeriodFrom), periodTo: new Date(customPeriodTo) };
  }

  // toZonedTime 把「現在」投影成業務時區的牆上時鐘時間，
  // 這樣 date-fns 的 startOf*/sub* 才能用該時區的日期邊界計算，
  // 而不是伺服器所在時區或 UTC 的邊界。
  // 再 floor 到分鐘，避免 periodTo（大多數 preset 都是「一直到現在」）帶著呼叫當下的秒數/毫秒，
  // 讓 log 出來的時間窗看起來髒髒的。
  const zonedNow = startOfMinute(toZonedTime(new Date(), timeZone));
  const { periodFrom: zonedPeriodFrom, periodTo: zonedPeriodTo } = presetWindow[preset](zonedNow);

  // fromZonedTime 把「業務時區的牆上時鐘時間」還原成真實的 UTC 時間點
  return {
    periodFrom: fromZonedTime(zonedPeriodFrom, timeZone),
    periodTo: fromZonedTime(zonedPeriodTo, timeZone),
  };
}
