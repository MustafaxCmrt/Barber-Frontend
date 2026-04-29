import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AdminServicesApi } from "@/api/admin";
import type {
  AdminServicesQuery,
  CreatedResponse,
  CreateServiceDto,
  MessageResponse,
  PagedResult,
  ServiceDetailDto,
  ServiceSummaryDto,
  UpdateServiceDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Admin Hizmetler React Query hook'ları (FAZ 9 / Bölüm 7.2).
 *
 * Mutation'lar admin services list/detail + public services + barber detail
 * cache'lerini invalidate eder (hizmet aktiflik/fiyat değişimi public listeyi
 * ve berber-hizmet eşlemelerini etkiler).
 */

const STALE = 30_000;

export const adminServicesKeys = {
  all: ["admin", "services"] as const,
  list: (query: AdminServicesQuery) =>
    [...adminServicesKeys.all, "list", query] as const,
  detail: (id: string) => [...adminServicesKeys.all, "detail", id] as const,
};

function invalidateAfterMutation(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: adminServicesKeys.all });
  // Public hizmet listeleri (BarberDetail'deki services ve ServiceAssignModal)
  qc.invalidateQueries({ queryKey: ["public", "services"] });
  // Admin berber detayında atanan hizmetler görünüyor
  qc.invalidateQueries({ queryKey: ["admin", "barbers", "detail"] });
}

export function useAdminServices(query: AdminServicesQuery) {
  return useQuery<PagedResult<ServiceSummaryDto>, ApiError>({
    queryKey: adminServicesKeys.list(query),
    queryFn: () => AdminServicesApi.list(query),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
}

export function useAdminServiceDetail(id: string | null) {
  return useQuery<ServiceDetailDto, ApiError>({
    queryKey: adminServicesKeys.detail(id ?? ""),
    queryFn: () => AdminServicesApi.getById(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateServiceMutation() {
  const qc = useQueryClient();
  return useMutation<CreatedResponse, ApiError, CreateServiceDto>({
    mutationFn: (body) => AdminServicesApi.create(body),
    onSuccess: () => invalidateAfterMutation(qc),
  });
}

export function useUpdateServiceMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: UpdateServiceDto }
  >({
    mutationFn: ({ id, body }) => AdminServicesApi.update(id, body),
    onSuccess: (_data, vars) => {
      invalidateAfterMutation(qc);
      qc.invalidateQueries({ queryKey: adminServicesKeys.detail(vars.id) });
    },
  });
}

export function useDeleteServiceMutation() {
  const qc = useQueryClient();
  return useMutation<MessageResponse, ApiError, { id: string }>({
    mutationFn: ({ id }) => AdminServicesApi.remove(id),
    onSuccess: () => invalidateAfterMutation(qc),
  });
}
