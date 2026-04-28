import { api } from "./client";
import type {
  PagedResult,
  PublicBarberDetailDto,
  PublicBarberDto,
  PublicBarbersQuery,
  PublicServiceDto,
  PublicServicesQuery,
} from "./types";

/**
 * Public (anonim) endpoint wrapper'ları (Bölüm 6).
 * FAZ 2 kapsamında sadece liste/detay endpoint'leri var;
 * Slot, randevu, lookup, cancel FAZ 3-4'te eklenecek.
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
};
