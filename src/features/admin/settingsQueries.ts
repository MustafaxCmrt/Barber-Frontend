import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShopSettingsApi } from "@/api/admin";
import type {
  MessageResponse,
  ShopSettingsDto,
  UpdateShopSettingsDto,
} from "@/api/types";
import type { ApiError } from "@/api/client";

/**
 * Admin Salon Ayarları React Query hook'ları (FAZ 10 / Bölüm 7.4).
 *
 * Ayar değişikliği public slot hesaplamasını ve berber schedule fallback'ini
 * etkileyebilir; bu yüzden ilgili cache'ler de invalidate edilir.
 */

const STALE = 30_000;

export const adminSettingsKeys = {
  all: ["admin", "settings"] as const,
  detail: () => [...adminSettingsKeys.all, "detail"] as const,
};

function invalidateAfterMutation(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: adminSettingsKeys.all });
  qc.invalidateQueries({ queryKey: ["public", "appointments", "slots"] });
  qc.invalidateQueries({ queryKey: ["admin", "barbers"] });
}

export function useShopSettings() {
  return useQuery<ShopSettingsDto, ApiError>({
    queryKey: adminSettingsKeys.detail(),
    queryFn: () => AdminShopSettingsApi.get(),
    staleTime: STALE,
  });
}

export function useUpdateShopSettingsMutation() {
  const qc = useQueryClient();
  return useMutation<MessageResponse, ApiError, UpdateShopSettingsDto>({
    mutationFn: (body) => AdminShopSettingsApi.update(body),
    onSuccess: () => invalidateAfterMutation(qc),
  });
}
