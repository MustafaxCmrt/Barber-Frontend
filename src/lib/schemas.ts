import { z } from "zod";
import dayjs from "dayjs";

/**
 * Bölüm 10.9 — randevu oluşturma form şeması.
 * Backend validation kuralları (Bölüm 6.6) ile uyumlu, FE'de ön-validate eder.
 *
 * NOT: Form alanı `customerName` olarak tutulur; backend `customerFullName`
 * beklediği için submit anında dönüşüm yapılır (AppointmentBookingPage).
 */
export const createAppointmentSchema = z.object({
  barberId: z.string().uuid(),
  serviceIds: z
    .array(z.string().uuid())
    .min(1, "En az bir hizmet seçin")
    .refine(
      (arr) => new Set(arr).size === arr.length,
      "Aynı hizmet birden fazla seçilemez",
    ),
  customerName: z
    .string()
    .trim()
    .min(2, "Ad soyad zorunlu")
    .max(100, "En fazla 100 karakter"),
  customerPhone: z
    .string()
    .regex(/^0[5][0-9]{9}$/, "Geçerli bir telefon girin (05XXXXXXXXX)"),
  notes: z.string().max(500, "En fazla 500 karakter").optional().or(z.literal("")),
  startTime: z
    .string()
    .min(1, "Tarih ve saat seçin")
    .refine((value) => {
      const d = dayjs(value);
      if (!d.isValid()) return false;
      return d.isAfter(dayjs());
    }, "Geçmiş bir saat seçilemez")
    .refine((value) => {
      const d = dayjs(value);
      if (!d.isValid()) return false;
      // Backend en fazla 60 gün ileri kabul ediyor (Bölüm 6.6).
      const max = dayjs().add(60, "day").endOf("day");
      return d.isBefore(max);
    }, "En fazla 60 gün ileri tarih seçebilirsiniz"),
});

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

/**
 * Bölüm 6.7 — lookup form şeması.
 * Backend regex'i daha esnek (`^\+?[0-9\s\-\(\)]{7,20}$`) ama UX'te
 * booking ile aynı 11 haneli TR formatını zorluyoruz — kullanıcı
 * randevuyu hangi formatla aldıysa onunla sorgulayacak.
 */
export const lookupPhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^0[5][0-9]{9}$/, "Geçerli bir telefon girin (05XXXXXXXXX)"),
});

export type LookupPhoneFormValues = z.infer<typeof lookupPhoneSchema>;

/**
 * Pre-prod sözleşmesi (Bölüm 1.2 + 9.3) — iptal kodu doğrulaması.
 * Backend regex: `^\d{6}$` (tam 6 hane, "0" ile başlayabilir).
 * Telefon zaten lookup adımında alındığı için sadece `code` doğrulanır.
 */
export const cancelAppointmentSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "İptal kodu 6 haneli rakam olmalı"),
});

export type CancelAppointmentFormValues = z.infer<
  typeof cancelAppointmentSchema
>;

/**
 * Bölüm 3.1 — admin login form.
 * Backend FluentValidation: Username NotEmpty + MaxLength=30, Password NotEmpty.
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Kullanıcı adı zorunlu")
    .max(30, "En fazla 30 karakter"),
  password: z.string().min(1, "Şifre zorunlu"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Bölüm 3.6 — şifre değiştirme form.
 * Backend kuralları (sıkılaştırıldı):
 *  - En az 10 karakter, en fazla 128
 *  - En az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter
 */
const strongPasswordSchema = z
  .string()
  .min(10, "Şifre en az 10 karakter olmalı")
  .max(128, "Şifre en fazla 128 karakter olabilir")
  .regex(/[A-Z]/, "En az 1 büyük harf içermeli")
  .regex(/[a-z]/, "En az 1 küçük harf içermeli")
  .regex(/[0-9]/, "En az 1 rakam içermeli")
  .regex(/[^A-Za-z0-9]/, "En az 1 özel karakter içermeli");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre zorunlu"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Yeni şifreyi tekrar girin"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Yeni şifre mevcut şifreyle aynı olamaz",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/**
 * Yeni endpoint: PUT /auth/change-username.
 * Backend: currentPassword NotEmpty; newUsername NotEmpty + MaxLength=30.
 */
export const changeUsernameSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre zorunlu"),
  newUsername: z
    .string()
    .trim()
    .min(1, "Yeni kullanıcı adı zorunlu")
    .max(30, "En fazla 30 karakter"),
});

export type ChangeUsernameFormValues = z.infer<typeof changeUsernameSchema>;

/**
 * Bölüm 7.1 — admin berber form (create/update ortak alanlar).
 * Backend FluentValidation:
 *  fullName NotEmpty + ≤50, specialty ≤200, photoUrl ≤500, bio ≤500.
 *
 * NOT: photoUrl URL formatına zorlanmaz (backend de string/MaxLength).
 * Boş string opsiyonel kabul edilir; submit anında undefined'a çevrilir.
 */
const optionalString = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter`)
    .optional()
    .or(z.literal(""));

export const createBarberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Ad soyad zorunlu")
    .max(50, "En fazla 50 karakter"),
  specialty: optionalString(200, "Uzmanlık"),
  photoUrl: optionalString(500, "Foto URL"),
  bio: optionalString(500, "Biyografi"),
});

export type CreateBarberFormValues = z.infer<typeof createBarberSchema>;

export const updateBarberSchema = createBarberSchema.extend({
  isActive: z.boolean(),
});

export type UpdateBarberFormValues = z.infer<typeof updateBarberSchema>;

/**
 * Bölüm 7.1 — izin günü ekleme.
 * date bugün veya sonrası, reason ≤200 (opsiyonel).
 */
export const createLeaveSchema = z.object({
  date: z
    .string()
    .min(1, "Tarih seçin")
    .refine((v) => {
      // YYYY-MM-DD karşılaştırması — local TZ'de
      const today = new Date();
      const todayStr =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");
      return v >= todayStr;
    }, "Bugün veya sonrası olmalı"),
  reason: optionalString(200, "Sebep"),
});

export type CreateLeaveFormValues = z.infer<typeof createLeaveSchema>;

/**
 * Bölüm 7.2 — admin hizmet form (create/update ortak alanlar).
 * Backend FluentValidation:
 *  name NotEmpty + ≤200, price 0-10000, durationMinutes 5-480.
 *
 * NOT: price ondalık sayı; durationMinutes tam sayı (dakika).
 */
export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Hizmet adı zorunlu")
    .max(200, "En fazla 200 karakter"),
  price: z
    .number({
      invalid_type_error: "Geçerli bir fiyat girin",
    })
    .min(0, "Fiyat 0'dan küçük olamaz")
    .max(10000, "Fiyat en fazla 10.000"),
  durationMinutes: z
    .number({
      invalid_type_error: "Geçerli bir süre girin",
    })
    .int("Süre tam sayı olmalı")
    .min(5, "En az 5 dakika")
    .max(480, "En fazla 480 dakika (8 saat)"),
});

export type CreateServiceFormValues = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.extend({
  isActive: z.boolean(),
});

export type UpdateServiceFormValues = z.infer<typeof updateServiceSchema>;

/**
 * Bölüm 7.4 — salon ayarları.
 * Backend validation:
 *  defaultOpenTime < defaultCloseTime, slotMinutes 5-120,
 *  maxAppointmentsPerPhonePerDay 1-20, minCancellationHoursBefore 0-72,
 *  closedDays distinct (.NET DayOfWeek: 0=Pazar ... 6=Cumartesi).
 */
export const shopSettingsSchema = z
  .object({
    defaultOpenTime: z.string().min(1, "Açılış saati zorunlu"),
    defaultCloseTime: z.string().min(1, "Kapanış saati zorunlu"),
    closedDays: z
      .array(z.union([
        z.literal(0),
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]))
      .refine(
        (days) => new Set(days).size === days.length,
        "Kapalı günler tekrarlı olamaz",
      ),
    slotMinutes: z
      .number({
        invalid_type_error: "Geçerli bir slot süresi girin",
      })
      .int("Slot süresi tam sayı olmalı")
      .min(5, "En az 5 dakika")
      .max(120, "En fazla 120 dakika"),
    maxAppointmentsPerPhonePerDay: z
      .number({
        invalid_type_error: "Geçerli bir günlük limit girin",
      })
      .int("Günlük limit tam sayı olmalı")
      .min(1, "En az 1")
      .max(20, "En fazla 20"),
    minCancellationHoursBefore: z
      .number({
        invalid_type_error: "Geçerli bir iptal süresi girin",
      })
      .int("İptal süresi tam sayı olmalı")
      .min(0, "0'dan küçük olamaz")
      .max(72, "En fazla 72 saat"),
  })
  .refine((d) => d.defaultOpenTime < d.defaultCloseTime, {
    path: ["defaultCloseTime"],
    message: "Kapanış saati açılıştan sonra olmalı",
  });

export type ShopSettingsFormValues = z.infer<typeof shopSettingsSchema>;
