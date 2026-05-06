import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AdminBarbersApi } from "@/api/admin";
import type {
  AdminBarbersQuery,
  AssignServicesDto,
  BarberDetailDto,
  BarberLeaveDto,
  BarberLeavesQuery,
  BarberScheduleDto,
  BarberSummaryDto,
  CreateBarberDto,
  CreateBarberLeaveDto,
  CreatedResponse,
  MessageResponse,
  PagedResult,
  UpdateBarberDto,
  UpdateBarberScheduleDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Admin Berberler React Query hook'ları (FAZ 8 / Bölüm 7.1).
 *
 * - List staleTime 30sn (sık değişmez ama CRUD sonrası invalidate).
 * - Detail staleTime 30sn (services field'ı assignServices sonrası invalidate).
 * - CRUD mutation'ları list + detail key'lerini invalidate eder.
 * - Public barber listeleri de etkilenir (aktiflik değişimi vs.) → public key'lerini de invalidate.
 */

const STALE = 30_000;

export const adminBarbersKeys = {
  all: ["admin", "barbers"] as const,
  list: (query: AdminBarbersQuery) =>
    [...adminBarbersKeys.all, "list", query] as const,
  detail: (id: string) => [...adminBarbersKeys.all, "detail", id] as const,
  schedule: (id: string) =>
    [...adminBarbersKeys.all, "schedule", id] as const,
  leaves: (id: string, query: BarberLeavesQuery) =>
    [...adminBarbersKeys.all, "leaves", id, query] as const,
};

function invalidatePublicBarbers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["public", "barbers"] });
  qc.invalidateQueries({ queryKey: ["public", "barber"] });
  qc.invalidateQueries({ queryKey: ["public", "services"] }); // listBarbersByService
}

export function useAdminBarbers(query: AdminBarbersQuery) {
  return useQuery<PagedResult<BarberSummaryDto>, ApiError>({
    queryKey: adminBarbersKeys.list(query),
    queryFn: () => AdminBarbersApi.list(query),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
}

export function useAdminBarberDetail(id: string | null) {
  return useQuery<BarberDetailDto, ApiError>({
    queryKey: adminBarbersKeys.detail(id ?? ""),
    queryFn: () => AdminBarbersApi.getById(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateBarberMutation() {
  const qc = useQueryClient();
  return useMutation<CreatedResponse, ApiError, CreateBarberDto>({
    mutationFn: (body) => AdminBarbersApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminBarbersKeys.all });
      invalidatePublicBarbers(qc);
    },
  });
}

export function useUpdateBarberMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: UpdateBarberDto }
  >({
    mutationFn: ({ id, body }) => AdminBarbersApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: adminBarbersKeys.all });
      qc.removeQueries({ queryKey: adminBarbersKeys.detail(vars.id) });
      invalidatePublicBarbers(qc);
    },
  });
}

export function useDeleteBarberMutation() {
  const qc = useQueryClient();
  return useMutation<MessageResponse, ApiError, { id: string }>({
    mutationFn: ({ id }) => AdminBarbersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminBarbersKeys.all });
      invalidatePublicBarbers(qc);
    },
  });
}

export function useAssignServicesMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: AssignServicesDto }
  >({
    mutationFn: ({ id, body }) => AdminBarbersApi.assignServices(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: adminBarbersKeys.detail(vars.id) });
      // Aktif berber-hizmet eşlemesi public listBarbersByService'i etkiler
      qc.invalidateQueries({ queryKey: ["public", "services"] });
    },
  });
}

// ============================================================
// Schedule
// ============================================================

export function useBarberSchedule(id: string | null) {
  return useQuery<BarberScheduleDto, ApiError>({
    queryKey: adminBarbersKeys.schedule(id ?? ""),
    queryFn: () => AdminBarbersApi.getSchedule(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useUpdateBarberScheduleMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; body: UpdateBarberScheduleDto }
  >({
    mutationFn: ({ id, body }) => AdminBarbersApi.updateSchedule(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: adminBarbersKeys.schedule(vars.id) });
      // Public slot hesaplaması bu schedule'a bağlı
      qc.invalidateQueries({ queryKey: ["public", "available-slots"] });
    },
  });
}

// ============================================================
// Leaves
// ============================================================

export function useBarberLeaves(id: string | null, query: BarberLeavesQuery) {
  return useQuery<BarberLeaveDto[], ApiError>({
    queryKey: adminBarbersKeys.leaves(id ?? "", query),
    queryFn: () => AdminBarbersApi.listLeaves(id as string, query),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateBarberLeaveMutation() {
  const qc = useQueryClient();
  return useMutation<
    CreatedResponse,
    ApiError,
    { id: string; body: CreateBarberLeaveDto }
  >({
    mutationFn: ({ id, body }) => AdminBarbersApi.createLeave(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: [...adminBarbersKeys.all, "leaves", vars.id],
      });
      qc.invalidateQueries({ queryKey: ["public", "available-slots"] });
    },
  });
}

export function useDeleteBarberLeaveMutation() {
  const qc = useQueryClient();
  return useMutation<
    MessageResponse,
    ApiError,
    { id: string; leaveId: string }
  >({
    mutationFn: ({ id, leaveId }) =>
      AdminBarbersApi.deleteLeave(id, leaveId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: [...adminBarbersKeys.all, "leaves", vars.id],
      });
      qc.invalidateQueries({ queryKey: ["public", "available-slots"] });
    },
  });
}
