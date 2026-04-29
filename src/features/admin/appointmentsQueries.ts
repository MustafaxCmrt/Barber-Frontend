import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AdminAppointmentsApi } from "@/api/admin";
import type {
  AdminAppointmentsQuery,
  AppointmentDetailDto,
  AppointmentSummaryDto,
  MessageResponse,
  PagedResult,
  UpdateAppointmentStatusDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Admin Randevular React Query hook'ları (FAZ 7 / Bölüm 7.3).
 *
 * staleTime kısa (30sn) — randevular dinamik (yeni booking, status update).
 * Status update mutation'ı liste + detail key'lerini invalidate eder.
 */

const STALE = 30_000;

export const adminAppointmentsKeys = {
  all: ["admin", "appointments"] as const,
  list: (query: AdminAppointmentsQuery) =>
    [...adminAppointmentsKeys.all, "list", query] as const,
  detail: (id: string) =>
    [...adminAppointmentsKeys.all, "detail", id] as const,
};

export function useAdminAppointments(query: AdminAppointmentsQuery) {
  return useQuery<PagedResult<AppointmentSummaryDto>, ApiError>({
    queryKey: adminAppointmentsKeys.list(query),
    queryFn: () => AdminAppointmentsApi.list(query),
    staleTime: STALE,
    placeholderData: (prev) => prev, // sayfa/filtre değişiminde flicker engeli
  });
}

export function useAdminAppointmentDetail(id: string | null) {
  return useQuery<AppointmentDetailDto, ApiError>({
    queryKey: adminAppointmentsKeys.detail(id ?? ""),
    queryFn: () => AdminAppointmentsApi.getById(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useUpdateAppointmentStatusMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: UpdateAppointmentStatusDto }
  >({
    mutationFn: ({ id, body }) => AdminAppointmentsApi.updateStatus(id, body),
    onSuccess: (_data, vars) => {
      // Liste sayfaları + detail invalidate
      qc.invalidateQueries({ queryKey: adminAppointmentsKeys.all });
      qc.invalidateQueries({
        queryKey: adminAppointmentsKeys.detail(vars.id),
      });
      // Dashboard summary / today-appointments da etkilenir — güvenli yenile.
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
