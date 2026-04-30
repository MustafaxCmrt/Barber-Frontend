import { useEffect } from "react";
import { Toaster } from "@/lib/toast";
import { AppRoutes } from "@/routes";
import {
  registerTokenProvider,
  registerUnauthorizedHandler,
} from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { AuthApi } from "@/api/auth";

/**
 * Auth ↔ axios client bağlantısı (Bölüm 3.3, 3.4).
 *
 * Module-load anında bir kez register ediliyor:
 *  - Token sağlayıcı: her request'te store'dan güncel token okur
 *  - 401 handler: store.logout() çağırır (interceptor /auth/login ve
 *    /auth/change-password endpoint'lerini muaf tutar; oralarda 401 domain
 *    auth hatası — session geçerli)
 *
 * Logout sonrası ProtectedRoute observe ettiği için Navigate ile login'e
 * yönlendiriliyor — full-reload yok.
 */
registerTokenProvider(() => useAuthStore.getState().token);
registerUnauthorizedHandler(() => useAuthStore.getState().logout());

export default function App() {
  useAuthBootstrap();

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
