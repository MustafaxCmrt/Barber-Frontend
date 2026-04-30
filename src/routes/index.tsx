import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LandingPage } from "@/pages/public/Landing";
import { BarbersPage } from "@/pages/public/BarbersPage";
import { BarberDetailPage } from "@/pages/public/BarberDetailPage";
import { ServicesPage } from "@/pages/public/ServicesPage";
import { AppointmentBookingPage } from "@/pages/public/AppointmentBookingPage";
import { AppointmentSuccessPage } from "@/pages/public/AppointmentSuccessPage";
import { LookupPage } from "@/pages/public/LookupPage";
import { LoginPage } from "@/pages/admin/LoginPage";
import { ChangePasswordPage } from "@/pages/admin/ChangePasswordPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { AppointmentsPage } from "@/pages/admin/AppointmentsPage";
import { BarbersPage as AdminBarbersPage } from "@/pages/admin/BarbersPage";
import { BarberFormPage } from "@/pages/admin/BarberFormPage";
import { BarberAdminDetailPage } from "@/pages/admin/BarberAdminDetailPage";
import { ServicesAdminPage } from "@/pages/admin/ServicesAdminPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";

/**
 * Bölüm 10.6 — sayfa yapısı.
 * FAZ 5'te /admin/* ve /admin/login eklendi (auth + protected).
 * FAZ 6'da /admin/dashboard gerçek sayfaya bağlandı.
 * FAZ 7'de /admin/appointments gerçek sayfaya bağlandı.
 * FAZ 8'de /admin/barbers + alt sayfalar gerçek sayfaya bağlandı.
 * FAZ 9'da /admin/services gerçek sayfaya bağlandı.
 * FAZ 10'da /admin/settings gerçek sayfaya bağlandı.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="hizmetler" element={<ServicesPage />} />
        <Route path="berberler" element={<BarbersPage />} />
        <Route path="berberler/:id" element={<BarberDetailPage />} />
        <Route path="randevu-al" element={<AppointmentBookingPage />} />
        <Route path="randevu-basarili" element={<AppointmentSuccessPage />} />
        <Route path="randevumu-bul" element={<LookupPage />} />
      </Route>

      <Route path="admin/login" element={<LoginPage />} />

      <Route
        path="admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="barbers" element={<AdminBarbersPage />} />
        <Route path="barbers/new" element={<BarberFormPage />} />
        <Route path="barbers/:id" element={<BarberAdminDetailPage />} />
        <Route path="barbers/:id/edit" element={<BarberFormPage />} />
        <Route path="services" element={<ServicesAdminPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
