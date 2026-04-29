import { api } from "./client";
import type {
  AdminAppointmentsQuery,
  AdminBarbersQuery,
  AdminServicesQuery,
  AppointmentDetailDto,
  AppointmentSummaryDto,
  AssignServicesDto,
  BarberDetailDto,
  BarberLeaveDto,
  BarberLeavesQuery,
  BarberScheduleDto,
  BarberSummaryDto,
  CreateBarberDto,
  CreateBarberLeaveDto,
  CreatedResponse,
  CreateServiceDto,
  MessageResponse,
  PagedResult,
  ServiceDetailDto,
  ServiceSummaryDto,
  UpdateAppointmentStatusDto,
  UpdateBarberDto,
  UpdateBarberScheduleDto,
  UpdateServiceDto,
} from "./types";

/**
 * Admin endpoint wrapper'ları (Bölüm 7).
 * FAZ 7 — Randevular CRUD (read + status update).
 * FAZ 8 — Berber CRUD + service assign + schedule + leaves.
 * FAZ 9 — Hizmet CRUD.
 * FAZ 10+ — Ayar wrapper'ları ileride buraya eklenecek
 * (Dashboard zaten src/api/dashboard.ts'te ayrı dosyada).
 */

function clean(q: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const AdminAppointmentsApi = {
  /** GET /api/Appointments/GetAll — Bölüm 7.3 */
  list(
    query: AdminAppointmentsQuery = {},
  ): Promise<PagedResult<AppointmentSummaryDto>> {
    return api
      .get<PagedResult<AppointmentSummaryDto>>("/api/Appointments/GetAll", {
        params: clean(query as unknown as Record<string, unknown>),
      })
      .then((r) => r.data);
  },

  /** GET /api/Appointments/{id} — Bölüm 7.3 */
  getById(id: string): Promise<AppointmentDetailDto> {
    return api
      .get<AppointmentDetailDto>(`/api/Appointments/${id}`)
      .then((r) => r.data);
  },

  /**
   * PUT /api/Appointments/{id}/status — Bölüm 7.3.
   * 422 INVALID_STATUS_TRANSITION → izinsiz geçiş (UI zaten disabled
   * etmiş olmalı; bu backend safety net).
   */
  updateStatus(
    id: string,
    body: UpdateAppointmentStatusDto,
  ): Promise<MessageResponse> {
    return api
      .put<MessageResponse>(`/api/Appointments/${id}/status`, body)
      .then((r) => r.data);
  },
};

// ============================================================
// Berberler — Bölüm 7.1
// ============================================================

export const AdminBarbersApi = {
  /** GET /api/Barbers/GetAll */
  list(
    query: AdminBarbersQuery = {},
  ): Promise<PagedResult<BarberSummaryDto>> {
    return api
      .get<PagedResult<BarberSummaryDto>>("/api/Barbers/GetAll", {
        params: clean(query as unknown as Record<string, unknown>),
      })
      .then((r) => r.data);
  },

  /** GET /api/Barbers/{id} */
  getById(id: string): Promise<BarberDetailDto> {
    return api
      .get<BarberDetailDto>(`/api/Barbers/${id}`)
      .then((r) => r.data);
  },

  /** POST /api/Barbers/create — 201 { message, id } */
  create(body: CreateBarberDto): Promise<CreatedResponse> {
    return api
      .post<CreatedResponse>("/api/Barbers/create", body)
      .then((r) => r.data);
  },

  /** PUT /api/Barbers/{id}/update */
  update(id: string, body: UpdateBarberDto): Promise<MessageResponse> {
    return api
      .put<MessageResponse>(`/api/Barbers/${id}/update`, body)
      .then((r) => r.data);
  },

  /** DELETE /api/Barbers/{id}/delete */
  remove(id: string): Promise<MessageResponse> {
    return api
      .delete<MessageResponse>(`/api/Barbers/${id}/delete`)
      .then((r) => r.data);
  },

  /**
   * POST /api/Barbers/{id}/services — Hizmet atama (M-N).
   * `serviceIds` distinct olmalı; boş list = tüm atamalar kalkar.
   */
  assignServices(
    id: string,
    body: AssignServicesDto,
  ): Promise<MessageResponse> {
    return api
      .post<MessageResponse>(`/api/Barbers/${id}/services`, body)
      .then((r) => r.data);
  },

  /** GET /api/Barbers/{id}/schedule — haftalık çalışma takvimi */
  getSchedule(id: string): Promise<BarberScheduleDto> {
    return api
      .get<BarberScheduleDto>(`/api/Barbers/${id}/schedule`)
      .then((r) => r.data);
  },

  /**
   * PUT /api/Barbers/{id}/schedule — 7 gün, distinct, working ⇒ start<end.
   *
   * Body şekli `UpdateBarberScheduleDto` wrapper objesi (`{ days: [...] }`).
   * Düz array göndermek "could not be converted to UpdateBarberScheduleDto"
   * hatasına neden oluyor — backend wrapper bekliyor.
   */
  updateSchedule(
    id: string,
    body: UpdateBarberScheduleDto,
  ): Promise<MessageResponse> {
    return api
      .put<MessageResponse>(`/api/Barbers/${id}/schedule`, body)
      .then((r) => r.data);
  },

  /** GET /api/Barbers/{id}/leaves?from=YYYY-MM-DD&to=YYYY-MM-DD */
  listLeaves(id: string, query: BarberLeavesQuery): Promise<BarberLeaveDto[]> {
    return api
      .get<BarberLeaveDto[]>(`/api/Barbers/${id}/leaves`, {
        params: clean(query as unknown as Record<string, unknown>),
      })
      .then((r) => r.data);
  },

  /**
   * POST /api/Barbers/{id}/leaves — bugün veya sonrası tarih.
   * 409 ConflictException → bu tarih için izin zaten var.
   */
  createLeave(
    id: string,
    body: CreateBarberLeaveDto,
  ): Promise<CreatedResponse> {
    return api
      .post<CreatedResponse>(`/api/Barbers/${id}/leaves`, body)
      .then((r) => r.data);
  },

  /** DELETE /api/Barbers/{id}/leaves/{leaveId} */
  deleteLeave(id: string, leaveId: string): Promise<MessageResponse> {
    return api
      .delete<MessageResponse>(`/api/Barbers/${id}/leaves/${leaveId}`)
      .then((r) => r.data);
  },
};

// ============================================================
// Hizmetler — Bölüm 7.2
// ============================================================

export const AdminServicesApi = {
  /** GET /api/Services/GetAll */
  list(
    query: AdminServicesQuery = {},
  ): Promise<PagedResult<ServiceSummaryDto>> {
    return api
      .get<PagedResult<ServiceSummaryDto>>("/api/Services/GetAll", {
        params: clean(query as unknown as Record<string, unknown>),
      })
      .then((r) => r.data);
  },

  /** GET /api/Services/{id} */
  getById(id: string): Promise<ServiceDetailDto> {
    return api
      .get<ServiceDetailDto>(`/api/Services/${id}`)
      .then((r) => r.data);
  },

  /**
   * POST /api/Services/create.
   * Validation: name 1-200, price 0-10000, durationMinutes 5-480.
   */
  create(body: CreateServiceDto): Promise<CreatedResponse> {
    return api
      .post<CreatedResponse>("/api/Services/create", body)
      .then((r) => r.data);
  },

  /** PUT /api/Services/{id}/update — tüm alanlar gönderilmeli (PUT semantiği). */
  update(id: string, body: UpdateServiceDto): Promise<MessageResponse> {
    return api
      .put<MessageResponse>(`/api/Services/${id}/update`, body)
      .then((r) => r.data);
  },

  /** DELETE /api/Services/{id}/delete */
  remove(id: string): Promise<MessageResponse> {
    return api
      .delete<MessageResponse>(`/api/Services/${id}/delete`)
      .then((r) => r.data);
  },
};
