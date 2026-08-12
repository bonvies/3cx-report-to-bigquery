import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  differenceInMinutes,
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

// 比照 3CX 網頁報表的日期選單，額外補上網頁沒有的 thisMinute/thisHour/lastMinute/last5Minutes/
// last10Minutes/last15Minutes/lastHalfHour/lastHour（方便驗證/除錯，或需要接近即時的短區間同步），
// custom 則對應網頁的 "Custom" —— 選這個時改讀 customPeriodFrom/customPeriodTo。
export const SYNC_PRESETS = [
  'custom',
  'thisMinute',
  'lastMinute',
  'last5Minutes',
  'last10Minutes',
  'last15Minutes',
  'lastHalfHour',
  'thisHour',
  'lastHour',
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

// 把 now 無條件捨去對齊到「每 N 分鐘一格」的網格上（例如 N=5 時，14:03 對齊到 14:00，14:07 對齊到 14:05），
// 用來算 lastNMinutes 這類短區間 preset 的邊界。N 必須整除 60（1/5/10/15/30/60）才能保證每小時的網格對齊一致。
// 排程頻率要跟 N 對齊（例如 last5Minutes 要搭配「每 5 分鐘整點觸發」的排程），
// 這樣連續執行算出來的區間才會首尾相接、不重疊不留縫——理由跟 thisHour/today 用 startOfHour/startOfDay 一樣。
function floorToMinuteGrid(now: Date, gridMinutes: number): Date {
  const minutesSinceHour = differenceInMinutes(now, startOfHour(now));
  const flooredMinutes = Math.floor(minutesSinceHour / gridMinutes) * gridMinutes;
  return addMinutes(startOfHour(now), flooredMinutes);
}

// 每個 preset 對應的時間窗計算方式，輸入/輸出都是「業務時區的牆上時鐘時間」，
// 而且 now 在傳進來之前已經先 floor 到分鐘（見 getSyncWindow），所以這裡完全不會碰到秒/毫秒的殘值。
// 分三種語意：
// - 「目前進行中、還沒結束的區間」(thisMinute/thisHour/today/thisMonth/thisYear)：
//   periodFrom 是區間起點，periodTo 是「下一個區間的起點」（不是現在）——區間本身還沒結束，
//   但 periodTo 用固定的下一個邊界而不是現在這個會一直變動的時間點，同一個區間內重跑幾次戳記都一樣，方便去重比對。
// - 「前一個已經結束的完整區間」(lastMinute/last5Minutes/last10Minutes/last15Minutes/lastHalfHour/lastHour/
//   yesterday/lastWeek/lastMonth/lastYear)：periodFrom/periodTo 是上一個完整區間的起訖點，不包含現在。
// - 「包含今天的 N 個完整日期」(last7Days/last30Days)：periodTo 固定是明天 00:00（涵蓋整個今天），
//   periodFrom 是 startOfDay(now - (N-1) 天) —— 减 (N-1) 不是 N，因為今天本身要算進這 N 天裡（fence-post）。
const presetWindow: Record<Exclude<SyncPreset, 'custom'>, (now: Date) => { periodFrom: Date; periodTo: Date }> = {
  thisMinute: (now) => ({ periodFrom: startOfMinute(now), periodTo: addMinutes(startOfMinute(now), 1) }),
  lastMinute: (now) => ({ periodFrom: subMinutes(startOfMinute(now), 1), periodTo: startOfMinute(now) }),
  last5Minutes: (now) => {
    const periodTo = floorToMinuteGrid(now, 5);
    return { periodFrom: subMinutes(periodTo, 5), periodTo };
  },
  last10Minutes: (now) => {
    const periodTo = floorToMinuteGrid(now, 10);
    return { periodFrom: subMinutes(periodTo, 10), periodTo };
  },
  last15Minutes: (now) => {
    const periodTo = floorToMinuteGrid(now, 15);
    return { periodFrom: subMinutes(periodTo, 15), periodTo };
  },
  lastHalfHour: (now) => {
    const periodTo = floorToMinuteGrid(now, 30);
    return { periodFrom: subMinutes(periodTo, 30), periodTo };
  },
  thisHour: (now) => ({ periodFrom: startOfHour(now), periodTo: addHours(startOfHour(now), 1) }),
  lastHour: (now) => ({ periodFrom: subHours(startOfHour(now), 1), periodTo: startOfHour(now) }),
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
