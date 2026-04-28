import dayjs from "dayjs";
import "dayjs/locale/tr";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

/**
 * Tarih/saat/para formatlayıcıları (TR locale, Europe/Istanbul tz).
 * Referans: frontenddöküman.md Bölüm 9.
 *
 * KRİTİK:
 * - appointment.startTime / endTime LOCAL DateTime (Z'siz) — backend TR sunucusu.
 * - createdAt/updatedAt/expiresAtUtc UTC (Z'li).
 * - Tüm UI saatleri TR olarak gösterilir (Bölüm 9.4).
 */

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("tr");

export const TZ = (import.meta.env.VITE_TZ as string) || "Europe/Istanbul";

/**
 * UTC ISO ("...Z") string'ini TR saatine çevirip formatlar.
 * createdAt / updatedAt / expiresAtUtc gibi alanlar için.
 */
export function formatUtcDateTime(
  iso: string | null | undefined,
  fmt = "DD.MM.YYYY HH:mm",
): string {
  if (!iso) return "—";
  return dayjs.utc(iso).tz(TZ).format(fmt);
}

/**
 * LOCAL DateTime (Z'siz) string'ini olduğu gibi formatlar.
 * appointment.startTime / endTime için (zaten TR saatinde geliyor).
 */
export function formatLocalDateTime(
  iso: string | null | undefined,
  fmt = "DD.MM.YYYY HH:mm",
): string {
  if (!iso) return "—";
  return dayjs(iso).format(fmt);
}

export function formatDate(
  iso: string | null | undefined,
  fmt = "DD.MM.YYYY",
): string {
  if (!iso) return "—";
  return dayjs(iso).format(fmt);
}

export function formatTime(
  iso: string | null | undefined,
  fmt = "HH:mm",
): string {
  if (!iso) return "—";
  return dayjs(iso).format(fmt);
}

/**
 * Long format ("1 Mayıs 2026, Cuma 14:00").
 */
export function formatLongLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayjs(iso).format("DD MMMM YYYY, dddd HH:mm");
}

/**
 * Backend'e startTime gönderirken kullanılır — LOCAL ISO (Z'siz).
 * Bölüm 9.2 örneği: "2026-05-01T14:00:00".
 */
export function toLocalISO(date: Date | dayjs.Dayjs | string): string {
  return dayjs(date).format("YYYY-MM-DDTHH:mm:ss");
}

/**
 * "YYYY-MM-DD" — DateOnly alanları için (slot query, leave date vb.).
 */
export function toDateOnly(date: Date | dayjs.Dayjs | string): string {
  return dayjs(date).format("YYYY-MM-DD");
}

/**
 * "HH:mm" — TimeOnly alanları için (schedule start/end).
 */
export function toTimeOnly(date: Date | dayjs.Dayjs | string): string {
  return dayjs(date).format("HH:mm");
}

/**
 * Bugünden itibaren N gün ileri (slot/randevu için 60 gün limiti var — Bölüm 6.6).
 */
export function addDays(days: number, base: Date | dayjs.Dayjs = dayjs()): dayjs.Dayjs {
  return dayjs(base).add(days, "day");
}

/**
 * Para formatı (TRY). Backend price → number, UI → "₺250,00".
 */
const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return moneyFormatter.format(amount);
}

/**
 * Süre — dakika cinsinden gelir, "45 dk" / "1 sa 30 dk" şeklinde gösterilir.
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

/**
 * .NET DayOfWeek (0=Pazar) → Türkçe tam ad.
 */
export const DAY_OF_WEEK_TR_LONG: Record<number, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
};

export const DAY_OF_WEEK_TR_SHORT: Record<number, string> = {
  0: "Paz",
  1: "Pzt",
  2: "Sal",
  3: "Çar",
  4: "Per",
  5: "Cum",
  6: "Cmt",
};

/**
 * Bölüm 6.8 — Frontend'de cancel butonunu disable etmek için kullanılır.
 * defaultCancelHours: Bölüm 7.4 'minCancellationHoursBefore' ayarına bağlı (default 2).
 */
export function isCancelable(
  startTimeLocalIso: string,
  minCancellationHoursBefore = 2,
): boolean {
  const start = dayjs(startTimeLocalIso);
  const cutoff = start.subtract(minCancellationHoursBefore, "hour");
  return dayjs().isBefore(cutoff);
}
