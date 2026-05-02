/**
 * BusinessRuleException kodları (Bölüm 4.2 + EK Cheat Sheet).
 * 422 status'lu hatalarda backend `extensions.code` field'ı bu sabitlerden biri olur.
 *
 * UI bu kodu yakalayıp özel mesaj/aksiyon gösterir.
 */

export const ErrorCode = {
  BARBER_INACTIVE: "BARBER_INACTIVE",
  SERVICE_NOT_OFFERED: "SERVICE_NOT_OFFERED",
  INVALID_SERVICES: "INVALID_SERVICES",
  SHOP_CLOSED: "SHOP_CLOSED",
  OUTSIDE_WORKING_HOURS: "OUTSIDE_WORKING_HOURS",
  SPAM_GUARD_TRIGGERED: "SPAM_GUARD_TRIGGERED",
  LOOKUP_RATE_LIMIT: "LOOKUP_RATE_LIMIT",
  CANCEL_WINDOW_PASSED: "CANCEL_WINDOW_PASSED",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  INVALID_RANGE: "INVALID_RANGE",
  INVALID_LIMIT: "INVALID_LIMIT",
  /** Login lockout: 10dk içinde 5 başarısız → 15dk kilit. */
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  /** Pre-prod 1.7 — 409 slot çakışması (3 yerden gelir: pre-check, tx-final, SQL race). */
  APPOINTMENT_SLOT_TAKEN: "APPOINTMENT_SLOT_TAKEN",
  /** Pre-prod 1.7 — 422 iptal: 5 yanlış kod sonrası 1 saatlik lockout. */
  APPOINTMENT_CANCEL_LOCKED: "APPOINTMENT_CANCEL_LOCKED",
  /** Pre-prod 1.7 — 422 iptal: eski randevu (kod özelliği öncesi), berberle iletişim gerekir. */
  APPOINTMENT_CANCEL_NO_CODE: "APPOINTMENT_CANCEL_NO_CODE",
  /** Pre-prod 1.7 — 422 iptal: kod yanlış (deneme sayacı +1). */
  APPOINTMENT_CANCEL_INVALID_CODE: "APPOINTMENT_CANCEL_INVALID_CODE",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Kullanıcı dostu Türkçe mesajlar — Bölüm 4.2 tablosundan.
 * Toast / banner içinde gösterilir.
 */
export const ERROR_CODE_MESSAGES: Record<ErrorCodeValue, string> = {
  BARBER_INACTIVE:
    "Bu berber şu an müsait değil. Lütfen sayfayı yenileyip tekrar deneyin.",
  SERVICE_NOT_OFFERED:
    "Seçilen hizmet bu berber tarafından sunulmuyor. Lütfen hizmet seçimini güncelleyin.",
  INVALID_SERVICES: "En az bir hizmet seçmelisiniz.",
  SHOP_CLOSED:
    "Salon o gün kapalı. Lütfen başka bir tarih seçin.",
  OUTSIDE_WORKING_HOURS:
    "Seçilen saat çalışma saatleri dışına taşıyor. Slot listesini yeniliyoruz.",
  SPAM_GUARD_TRIGGERED:
    "Çok fazla randevu denemesi yaptınız. Lütfen 30 dakika sonra tekrar deneyin.",
  LOOKUP_RATE_LIMIT:
    "Çok fazla sorgu yaptınız. Lütfen 1 dakika bekleyip tekrar deneyin.",
  CANCEL_WINDOW_PASSED:
    "Randevu başlangıcına 2 saatten az kaldığı için iptal edilemez.",
  INVALID_STATUS_TRANSITION:
    "Bu randevu zaten son durumunda — durum değişikliği yapılamaz.",
  INVALID_RANGE:
    "Geçersiz tarih aralığı seçildi.",
  INVALID_LIMIT:
    "Geçersiz limit değeri seçildi.",
  ACCOUNT_LOCKED:
    "Çok fazla başarısız deneme. Hesap geçici olarak kilitlendi. Yaklaşık 15 dakika sonra tekrar deneyin.",
  APPOINTMENT_SLOT_TAKEN:
    "Bu slot az önce başkası tarafından alındı. Lütfen başka bir saat seçin.",
  APPOINTMENT_CANCEL_LOCKED:
    "Çok fazla yanlış deneme. Lütfen 1 saat sonra tekrar deneyin.",
  APPOINTMENT_CANCEL_NO_CODE:
    "Bu randevu telefondan iptal edilemiyor. Lütfen berberle iletişime geçin.",
  APPOINTMENT_CANCEL_INVALID_CODE:
    "Geçersiz iptal kodu. Lütfen kontrol edip tekrar deneyin.",
};

/**
 * Kod bilinmeyebilir — fallback mesaj.
 */
export function getErrorMessage(code: string | undefined | null): string {
  if (!code) return "Bir hata oluştu, lütfen tekrar deneyin.";
  if (code in ERROR_CODE_MESSAGES) {
    return ERROR_CODE_MESSAGES[code as ErrorCodeValue];
  }
  return "İşlem tamamlanamadı, lütfen tekrar deneyin.";
}
