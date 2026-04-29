import { Navigate, useLocation } from "react-router-dom";
import { isTokenExpired, useAuthStore } from "@/stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Varsayılan: /admin/login */
  redirectTo?: string;
}

/**
 * Auth-protected route wrapper (Bölüm 3.4).
 *
 * Kontrol mantığı:
 *  1) Store'da token yok / isAuthenticated=false  → redirect
 *  2) expiresAtUtc geçmişse                       → logout + redirect
 *
 * 401 interceptor ayrıca her API çağrısında logout tetikliyor; bu wrapper
 * sadece "henüz API çağırmadan önce" güvenlik kapısıdır.
 */
export function ProtectedRoute({
  children,
  redirectTo = "/admin/login",
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const expiresAtUtc = useAuthStore((s) => s.expiresAtUtc);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (isTokenExpired(expiresAtUtc)) {
    // Render path'inde set yapmamalı, ama logout işi sade bir mutator —
    // Zustand action'ı state setlerken React'e re-render emrediyor.
    // Yan etki olarak render-time'da yapmak yerine queueMicrotask ile bir
    // tick sonrasına alıyoruz; Navigate aynı render'da yine login'e yönlendiriyor.
    queueMicrotask(() => logout());
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}
