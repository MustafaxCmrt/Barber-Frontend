import { api } from "./client";
import type {
  DashboardSummaryDto,
  RevenueTrendItemDto,
  TodayAppointmentItemDto,
  TopServiceItemDto,
} from "./types";

/**
 * Bölüm 7.5 — admin Dashboard endpoint wrapper'ları.
 * Tümü Authorize(Roles="Admin") — `Authorization: Bearer <token>` zorunlu.
 *
 * Hata kodları:
 *  - 422 INVALID_RANGE → days aralık dışı
 *  - 422 INVALID_LIMIT → limit aralık dışı
 */

function clean(q: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const DashboardApi = {
  /** GET /api/Dashboard/summary */
  summary(): Promise<DashboardSummaryDto> {
    return api
      .get<DashboardSummaryDto>("/api/Dashboard/summary")
      .then((r) => r.data);
  },

  /** GET /api/Dashboard/today-appointments */
  todayAppointments(): Promise<TodayAppointmentItemDto[]> {
    return api
      .get<TodayAppointmentItemDto[]>("/api/Dashboard/today-appointments")
      .then((r) => r.data);
  },

  /** GET /api/Dashboard/revenue-trend?days=30 */
  revenueTrend(days: number): Promise<RevenueTrendItemDto[]> {
    return api
      .get<RevenueTrendItemDto[]>("/api/Dashboard/revenue-trend", {
        params: clean({ days }),
      })
      .then((r) => r.data);
  },

  /** GET /api/Dashboard/top-services?limit=5&days=30 */
  topServices(limit: number, days: number): Promise<TopServiceItemDto[]> {
    return api
      .get<TopServiceItemDto[]>("/api/Dashboard/top-services", {
        params: clean({ limit, days }),
      })
      .then((r) => r.data);
  },
};
