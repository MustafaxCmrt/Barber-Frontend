import { useMutation } from "@tanstack/react-query";
import { AuthApi } from "@/api/auth";
import type {
  ChangePasswordDto,
  LoginRequestDto,
  MessageResponse,
  TokenResponseDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Admin auth — React Query mutation hook'ları (Bölüm 3).
 * /me single-shot çağrısı `useAuthBootstrap` içinde yapıldığı için
 * burada query hook'u yok.
 */

export const adminAuthKeys = {
  all: ["admin", "auth"] as const,
  me: () => ["admin", "auth", "me"] as const,
};

export function useLoginMutation() {
  return useMutation<TokenResponseDto, ApiError, LoginRequestDto>({
    mutationFn: (dto) => AuthApi.login(dto),
  });
}

export function useChangePasswordMutation() {
  return useMutation<MessageResponse, ApiError, ChangePasswordDto>({
    mutationFn: (dto) => AuthApi.changePassword(dto),
  });
}
