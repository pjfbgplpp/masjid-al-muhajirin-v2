import { DisplayConfig, PrayerTimeItem } from '../types';
import { calculatePrayerTimes } from '../utils/prayerCalculator';
import { getHijriDate } from '../utils/hijriCalendar';

// In-memory only — no IndexedDB. calculatePrayerTimes() is a fast, pure,
// deterministic astronomical calculation (adhan library), so recomputing it is
// cheap; this Map just avoids redundant recalculation within a single session.
export interface StoredPrayerDay {
  id: string; // `${code}:${dateStr}` e.g. "MASJID-01:2026-09-04"
  code: string;
  dateStr: string; // "YYYY-MM-DD"
  monthKey: string; // "YYYY-MM"
  gregorianDateStr: string;
  hijriDateStr: string;
  times: PrayerTimeItem[];
  updatedAt: string;
}

function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// In-memory quick cache to avoid redundant recalculation during rapid renders
const memoryPrayerDayCache = new Map<string, StoredPrayerDay>();

/**
 * Pre-generate and memoize 12 months (365 days) of prayer times in memory for the
 * current session. Retains the exact mathematical astronomical formula (adhan
 * library + Kemenag/etc parameters + adjustments).
 */
export async function generateAndCache12MonthSchedule(
  config: DisplayConfig,
  forceRegenerate: boolean = false
): Promise<number> {
  const code = (config.code || 'MASJID-01').trim().toUpperCase();
  const today = new Date();
  const todayStr = formatDateToIso(today);

  if (!forceRegenerate && memoryPrayerDayCache.has(`${code}:${todayStr}`)) {
    // Already generated this session
    return memoryPrayerDayCache.size;
  }

  const schedules: StoredPrayerDay[] = [];
  const daysToGenerate = 365;

  for (let i = 0; i < daysToGenerate; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dateStr = formatDateToIso(d);
    const monthKey = getMonthKey(d);

    const gregorianDateStr = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const hijri = getHijriDate(d, config.layout?.hijriAdjustmentDays || 0);

    const times = calculatePrayerTimes(config.location, config.prayerAdjustments, d);

    const record: StoredPrayerDay = {
      id: `${code}:${dateStr}`,
      code,
      dateStr,
      monthKey,
      gregorianDateStr,
      hijriDateStr: hijri.formattedWithDay,
      times,
      updatedAt: new Date().toISOString(),
    };

    schedules.push(record);
    memoryPrayerDayCache.set(record.id, record);
  }

  return schedules.length;
}

/**
 * Get prayer times for any specific date. Checks the in-memory cache first, then
 * falls back to the (instant) astronomical calculation directly.
 */
export async function getPrayerScheduleForDate(
  config: DisplayConfig,
  targetDate: Date = new Date()
): Promise<PrayerTimeItem[]> {
  const code = (config.code || 'MASJID-01').trim().toUpperCase();
  const dateStr = formatDateToIso(targetDate);
  const cacheKey = `${code}:${dateStr}`;

  const inMemory = memoryPrayerDayCache.get(cacheKey);
  if (inMemory && inMemory.times && inMemory.times.length > 0) {
    return inMemory.times;
  }

  const freshTimes = calculatePrayerTimes(config.location, config.prayerAdjustments, targetDate);
  return freshTimes;
}

/**
 * Get prayer schedules for an entire month (useful for monthly schedule calendar or export).
 */
export async function getMonthlyPrayerSchedule(
  config: DisplayConfig,
  year: number,
  month: number // 1-12
): Promise<StoredPrayerDay[]> {
  const code = (config.code || 'MASJID-01').trim().toUpperCase();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const fromMemory = Array.from(memoryPrayerDayCache.values()).filter(
    (r) => r.code === code && r.monthKey === monthKey
  );
  if (fromMemory.length > 0) {
    return fromMemory.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }

  // Generate on-the-fly for requested month if not already cached this session
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays: StoredPrayerDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dateStr = formatDateToIso(d);
    const gregorianDateStr = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const hijri = getHijriDate(d, config.layout?.hijriAdjustmentDays || 0);
    const times = calculatePrayerTimes(config.location, config.prayerAdjustments, d);

    const record: StoredPrayerDay = {
      id: `${code}:${dateStr}`,
      code,
      dateStr,
      monthKey,
      gregorianDateStr,
      hijriDateStr: hijri.formattedWithDay,
      times,
      updatedAt: new Date().toISOString(),
    };
    monthDays.push(record);
    memoryPrayerDayCache.set(record.id, record);
  }

  return monthDays;
}
