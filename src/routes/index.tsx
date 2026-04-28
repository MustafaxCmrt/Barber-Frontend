import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { LandingPage } from "@/pages/public/Landing";
import { BarbersPage } from "@/pages/public/BarbersPage";
import { BarberDetailPage } from "@/pages/public/BarberDetailPage";
import { ServicesPage } from "@/pages/public/ServicesPage";

/**
 * Bölüm 10.6 — sayfa yapısı.
 * FAZ 2'de public taraf — randevu/lookup placeholder bırakıyoruz, FAZ 3-4'te eklenecek.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="hizmetler" element={<ServicesPage />} />
        <Route path="berberler" element={<BarbersPage />} />
        <Route path="berberler/:id" element={<BarberDetailPage />} />
        <Route path="randevu-al" element={<NotImplementedPage label="Randevu Al" phase="FAZ 3" />} />
        <Route path="randevumu-bul" element={<NotImplementedPage label="Randevumu Bul" phase="FAZ 4" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function NotImplementedPage({ label, phase }: { label: string; phase: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-600 mb-4">
        {phase}
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-charcoal-900 mb-3">
        {label}
      </h1>
      <p className="text-charcoal-300">
        Bu sayfa {phase}'de yapılacak.
      </p>
    </div>
  );
}
