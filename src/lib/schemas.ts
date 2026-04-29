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
