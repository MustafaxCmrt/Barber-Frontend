import { useQuery } from "@tanstack/react-query";
import { PublicApi } from "@/api/public";
import type {
  PublicBarbersQuery,
  PublicServicesQuery,
} from "@/api/types";

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
