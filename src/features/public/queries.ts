import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicApi } from "@/api/public";
import type {
  AppointmentLookupItemDto,
  AppointmentLookupRequestDto,
  AvailabilityQueryDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  CreateAppointmentResultDto,
  MessageResponse,
  PublicBarbersQuery,
  PublicServicesQuery,
  SlotQueryDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Public endpoint'leri için React Query hook'ları.
 * Query key konvansiyonu: ["public", "barbers"|"services"|..., ...args]
 *
 * staleTime: 60sn — backend public listeler nadir değişir, refetch baskısı düşük.
 */

export const publicKeys = {
  all: ["public"] as const,
  barbers: (query: PublicBarbersQuery) =>
    ["public", "barbers", query] as const,
  barberDetail: (id: string) => ["public", "barber", id] as const,
  services: (query: PublicServicesQuery) =>
    ["public", "services", query] as const,
  barbersByService: (serviceId: string, query: PublicBarbersQuery) =>
    ["public", "services", serviceId, "barbers", query] as const,
  availableSlots: (body: SlotQueryDto) =>
    ["public", "available-slots", body] as const,
  availability: (body: AvailabilityQueryDto) =>
    ["public", "availability", body] as const,
};

export function usePublicBarbers(query: PublicBarbersQuery = {}) {
  return useQuery({
    queryKey: publicKeys.barbers(query),
    queryFn: () => PublicApi.listBarbers(query),
    staleTime: 60_000,
  });
}

export function usePublicBarberDetail(id: string | undefined) {
  return useQuery({
    queryKey: publicKeys.barberDetail(id ?? ""),
    queryFn: () => PublicApi.getBarberDetail(id as string),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePublicServices(query: PublicServicesQuery = {}) {
  return useQuery({
    queryKey: publicKeys.services(query),
    queryFn: () => PublicApi.listServices(query),
    staleTime: 60_000,
  });
}

export function useBarbersByService(
  serviceId: string | undefined,
  query: PublicBarbersQuery = {},
) {
  return useQuery({
    queryKey: publicKeys.barbersByService(serviceId ?? "", query),
    queryFn: () => PublicApi.listBarbersByService(serviceId as string, query),
    enabled: !!serviceId,
    staleTime: 60_000,
  });
}

/**
 * POST /api/public/appointments/available-slots — Bölüm 6.5.
 * `enabled` flag'i ile (barberId + date + en az 1 service) hazır olmadan tetiklenmez.
 *
 * staleTime kısa (15sn) — slotlar hızlı dolabilir, conflict durumunda
 * `queryClient.invalidateQueries({ queryKey: publicKeys.availableSlots(...) })` ile yenilenir.
 *
 * Slot ekranında müşteri 1-3 dk kalabiliyor; bu sürede başkası slot alabilir
 * veya iptal edebilir. Otomatik tazeleme:
 *  - refetchInterval: 30sn (sessizce arkadan)
 *  - refetchOnWindowFocus: true — sekmeden ayrılıp dönünce anında yenile.
 *    main.tsx'te global default false; slot için açıkça override ediyoruz.
 *  - refetchIntervalInBackground default false — sekme arka plandayken durur.
 */
export function useAvailableSlots(
  body: SlotQueryDto,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) &&
    !!body.barberId &&
    !!body.date &&
    body.serviceIds.length > 0;

  return useQuery({
    queryKey: publicKeys.availableSlots(body),
    queryFn: () => PublicApi.getAvailableSlots(body),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * POST /api/public/appointments/availability — takvim aralık sorgusu.
 *
 * `enabled`: barberId + en az 1 service + geçerli aralık ([from..to] içinde
 * from <= to ve max 31 gün).
 *
 * staleTime: 30sn — takvim verisi yavaş değişir; ay başına bir istek yeterli.
 * `refetchInterval` YOK — saat ekranındaki polling slot listesi içindi.
 *
 * 4xx hatalarında retry kapalı (kullanıcı/iş kuralı hatası, retry düzeltmez).
 */
export function useAvailability(
  body: AvailabilityQueryDto,
  options: { enabled?: boolean } = {},
) {
  const validRange =
    !!body.from &&
    !!body.to &&
    body.from <= body.to &&
    daysBetween(body.from, body.to) <= 30;

  const enabled =
    (options.enabled ?? true) &&
    !!body.barberId &&
    body.serviceIds.length > 0 &&
    body.serviceIds.length <= 10 &&
    new Set(body.serviceIds).size === body.serviceIds.length &&
    validRange;

  return useQuery({
    queryKey: publicKeys.availability(body),
    queryFn: () => PublicApi.getAvailability(body),
    enabled,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      const apiError = error as ApiError | undefined;
      if (
        apiError &&
        typeof apiError.status === "number" &&
        apiError.status >= 400 &&
        apiError.status < 500
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/** "YYYY-MM-DD" iki tarih arası gün farkı (UTC bazlı, naive). */
function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10)),
  );
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * POST /api/public/appointments — Pre-prod sözleşmesi (Bölüm 1.1).
 * 201 → CreateAppointmentResultDto (id + cancellationCode + message).
 * 409 / 422 / 400 hata kararları çağıran sayfaya bırakılır (Bölüm 8.1, 8.7).
 */
export function useCreateAppointmentMutation() {
  return useMutation<
    CreateAppointmentResultDto,
    ApiError,
    CreateAppointmentDto
  >({
    mutationFn: (body) => PublicApi.createAppointment(body),
  });
}

/**
 * POST /api/public/appointments/lookup — Bölüm 6.7.
 * Mutation kullanılıyor (query değil): enumeration koruması için cache'lemek
 * istemiyoruz, her submit yeni fetch.
 */
export function useAppointmentLookupMutation() {
  return useMutation<
    AppointmentLookupItemDto[],
    ApiError,
    AppointmentLookupRequestDto
  >({
    mutationFn: (body) => PublicApi.lookupAppointments(body),
  });
}

/**
 * POST /api/public/appointments/{id}/cancel — Bölüm 6.8.
 * Sayfa içinde re-lookup ile listeyi yeniliyoruz; bu yüzden
 * mutation invalidateQueries çağırmıyor.
 */
export function useCancelAppointmentMutation() {
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: CancelAppointmentDto }
  >({
    mutationFn: ({ id, body }) => PublicApi.cancelAppointment(id, body),
  });
}
