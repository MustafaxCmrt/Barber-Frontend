import { useQuery } from "@tanstack/react-query";
import { DashboardApi } from "@/api/dashboard";

/**
 * Admin dashboard React Query hook'ları (FAZ 6 / Bölüm 7.5).
 *
 * staleTime: 60sn — dashboard verisi sık değişmez, yeniden fetch baskısını
 * azaltır. Manuel refetch için React Query devtools / `.refetch()` yeterli.
 */

const STALE = 60_000;

export const dashboardKeys = {
  all: ["admin", "dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  todayAppointments: () =>
    [...dashboardKeys.all, "today-appointments"] as const,
  revenueTrend: (days: number) =>
    [...dashboardKeys.all, "revenue-trend", days] as const,
  topServices: (limit: number, days: number) =>
    [...dashboardKeys.all, "top-services", limit, days] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => DashboardApi.summary(),
    staleTime: STALE,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: dashboardKeys.todayAppointments(),
    queryFn: () => DashboardApi.todayAppointments(),
    staleTime: STALE,
  });
}

export function useRevenueTrend(days: number) {
  return useQuery({
    queryKey: dashboardKeys.revenueTrend(days),
    queryFn: () => DashboardApi.revenueTrend(days),
    staleTime: STALE,
  });
}

export function useTopServices(limit: number, days: number) {
  return useQuery({
    queryKey: dashboardKeys.topServices(limit, days),
    queryFn: () => DashboardApi.topServices(limit, days),
    staleTime: STALE,
  });
}
