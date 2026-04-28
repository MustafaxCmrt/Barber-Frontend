import { api } from "./client";
import type {
  ChangePasswordDto,
  LoginRequestDto,
  MeResponseDto,
  MessageResponse,
  TokenResponseDto,
} from "./types";

/**
 * Auth endpoint wrapper'ları (Bölüm 3).
 * FAZ 1'de sadece export ediyoruz, çağırma FAZ 5'te.
 */

export const AuthApi = {
  /** POST /api/auth/login — anonim, public-strict (3/dk/IP) */
  login(dto: LoginRequestDto): Promise<TokenResponseDto> {
    return api
      .post<TokenResponseDto>("/api/auth/login", dto)
      .then((r) => r.data);
  },

  /** GET /api/auth/me — Authorize(Roles="Admin") */
  me(): Promise<MeResponseDto> {
    return api.get<MeResponseDto>("/api/auth/me").then((r) => r.data);
  },

  /** PUT /api/auth/change-password — Authorize(Roles="Admin") */
  changePassword(dto: ChangePasswordDto): Promise<MessageResponse> {
    return api
      .put<MessageResponse>("/api/auth/change-password", dto)
      .then((r) => r.data);
  },
};
