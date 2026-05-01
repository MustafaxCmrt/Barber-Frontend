import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster, notify } from "@/lib/toast";
import { AppRoutes } from "@/routes";
import {
  registerTokenProvider,
  registerUnauthorizedHandler,
} from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { AuthApi } from "@/api/auth";
import {
  getAdminAppointmentConnection,
  startAdminAppointmentConnection,
  stopAdminAppointmentConnection,
  subscribeAppointmentCreated,
  subscribeAuthError,
  subscribeReconnected,
} from "@/services/realtime/adminAppointmentHub";
import { adminAppointmentsKeys } from "@/features/admin/appointmentsQueries";
import { dashboardKeys } from "@/features/admin/dashboardQueries";
import { formatLocalDateTime } from "@/lib/formatters";

/**
 * Auth ↔ axios client bağlantısı (Bölüm 3.3, 3.4).
 *
 * Module-load anında bir kez register ediliyor:
 *  - Token sağlayıcı: her request'te store'dan güncel token okur
 *  - 401 handler: realtime hub'ı stop eder + store.logout() çağırır.
 *    (Interceptor /auth/login, /auth/change-password ve /auth/change-username
 *    endpoint'lerini muaf tutar; oralarda 401 domain auth hatası — session
 *    geçerli, logout etmiyoruz.)
 *
 * Logout sonrası ProtectedRoute observe ettiği için Navigate ile login'e
 * yönlendiriliyor — full-reload yok.
 */
registerTokenProvider(() => useAuthStore.getState().token);
registerUnauthorizedHandler(() => {
  void stopAdminAppointmentConnection();
  useAuthStore.getState().logout();
});

export default function App() {
  useAuthBootstrap();
  useAdminRealtime();

  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

/**
 * Bölüm 8.3 [5] — App boot kontrolü.
 * Token sessionStorage'dan hydrate edildiyse /me ile doğrula. 401 dönerse
 * interceptor logout tetikler ve storage temizlenir.
 */
function useAuthBootstrap() {
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    AuthApi.me().catch(() => {
      // 401 / network: interceptor zaten gerekli aksiyonu aldı.
    });
  }, []);
}

/**
 * SignalR admin realtime bağlantısının login süresine bağlı yaşam döngüsü.
 *
 * - isAuthenticated true olunca: Hub'a bağlan, event subscription'larını kur,
 *   ilk açılışta bir kez `appointments` + `dashboard` cache'lerini invalidate
 *   et (reconnect sırasında kaçan event olabilir).
 * - isAuthenticated false olunca: bağlantıyı stop et + subscription'ları sök.
 *
 * Token store'dan canlı okunduğu için change-username sonrası rotate edilen
 * token bir sonraki reconnect'te otomatik kullanılır.
 */
function useAdminRealtime() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      void stopAdminAppointmentConnection();
      return;
    }

    const conn = getAdminAppointmentConnection(
      () => useAuthStore.getState().token,
    );

    const invalidateAppointmentCaches = () => {
      void queryClient.invalidateQueries({
        queryKey: adminAppointmentsKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    };

    const unsubscribeCreated = subscribeAppointmentCreated((payload) => {
      notify.success(
        `Yeni randevu: ${payload.customerFullName} → ${payload.barberName} (${formatLocalDateTime(payload.startTime)})`,
      );
      invalidateAppointmentCaches();
    });

    const unsubscribeReconnected = subscribeReconnected(() => {
      // Bağlantı koptu → tekrar açıldı; kopukken gelen event'leri kaçırmış
      // olabiliriz. Liste/dashboard'u zorla tazele.
      invalidateAppointmentCaches();
    });

    const unsubscribeAuthError = subscribeAuthError(() => {
      // 401 / Unauthorized: SecurityStamp rotate olmuş ya da token süresi
      // dolmuş. REST 401 handler ile aynı davranış — logout + login redirect
      // (ProtectedRoute observe ediyor).
      notify.error("Oturumunuz sona erdi, lütfen tekrar giriş yapın.");
      useAuthStore.getState().logout();
    });

    startAdminAppointmentConnection(conn)
      .then(() => {
        // İlk bağlantı sonrası senkron — ekran açılır açılmaz son halini çeksin.
        invalidateAppointmentCaches();
      })
      .catch((err: unknown) => {
        console.error("[realtime] start failed", err);
        // İlk handshake 401: onclose tetiklenmediği için burada da kontrol et.
        const msg = err instanceof Error ? err.message : String(err ?? "");
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          notify.error("Oturumunuz sona erdi, lütfen tekrar giriş yapın.");
          useAuthStore.getState().logout();
        }
      });

    return () => {
      unsubscribeCreated();
      unsubscribeReconnected();
      unsubscribeAuthError();
      // Bağlantıyı KAPATMA — login süresince ayakta kalsın. Sadece
      // subscription'ları sök. Logout sırasında store.isAuthenticated false
      // olduğunda bu effect bir sonraki render'da bağlantıyı stop edecek.
    };
  }, [isAuthenticated, queryClient]);
}
