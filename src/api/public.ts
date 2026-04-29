import { api } from "./client";
import type {
  AvailableSlotsDto,
  CreateAppointmentDto,
  CreatedResponse,
  PagedResult,
  PublicBarberDetailDto,
  PublicBarberDto,
  PublicBarbersQuery,
  PublicServiceDto,
  PublicServicesQuery,
  SlotQueryDto,
} from "./types";

/**
 * Public (anonim) endpoint wrapper'ları (Bölüm 6).
 * FAZ 3'te slot hesaplama + randevu oluşturma eklendi.
 * Lookup / cancel FAZ 4'te eklenecek.
 */

function cleanQuery(q: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const PublicApi = {
  /** GET /api/public/barbers */
  listBarbers(query: PublicBarbersQuery = {}): Promise<PagedResult<PublicBarberDto>> {
    return api
      .get<PagedResult<PublicBarberDto>>("/api/public/barbers", {
        params: cleanQuery(query),
      })
      .then((r) => r.data);
  },

  /** GET /api/public/barbers/{id} */
  getBarberDetail(id: string): Promise<PublicBarberDetailDto> {
    return api
      .get<PublicBarberDetailDto>(`/api/public/barbers/${id}`)
      .then((r) => r.data);
  },

  /** GET /api/public/services */
  listServices(query: PublicServicesQuery = {}): Promise<PagedResult<PublicServiceDto>> {
    return api
      .get<PagedResult<PublicServiceDto>>("/api/public/services", {
        params: cleanQuery(query),
      })
      .then((r) => r.data);
  },

  /** GET /api/public/services/{id}/barbers */
  listBarbersByService(
    serviceId: string,
    query: PublicBarbersQuery = {},
  ): Promise<PagedResult<PublicBarberDto>> {
    return api
      .get<PagedResult<PublicBarberDto>>(
        `/api/public/services/${serviceId}/barbers`,
        { params: cleanQuery(query) },
      )
      .then((r) => r.data);
  },

  /**
   * POST /api/public/appointments/available-slots — Bölüm 6.5.
   * Body: { barberId, date (YYYY-MM-DD), serviceIds }
   */
  getAvailableSlots(body: SlotQueryDto): Promise<AvailableSlotsDto> {
    return api
      .post<AvailableSlotsDto>("/api/public/appointments/available-slots", body)
      .then((r) => r.data);
  },

  /**
   * POST /api/public/appointments — Bölüm 6.6.
   * 201 Created → { message, id }.
   */
  createAppointment(body: CreateAppointmentDto): Promise<CreatedResponse> {
    return api
      .post<CreatedResponse>("/api/public/appointments", body)
      .then((r) => r.data);
  },
};
