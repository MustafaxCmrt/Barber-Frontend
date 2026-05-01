import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicApi } from "@/api/public";
import type {
  AppointmentLookupItemDto,
  AppointmentLookupRequestDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  CreatedResponse,
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
 * POST /api/public/appointments — Bölüm 6.6.
 * 409 / 422 / 400 hata kararları çağıran sayfaya bırakılır (Bölüm 8.1, 8.7).
 */
export function useCreateAppointmentMutation() {
  return useMutation<CreatedResponse, ApiError, CreateAppointmentDto>({
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
