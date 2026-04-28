import { Routes, Route } from "react-router-dom";

function LandingPlaceholder() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center space-y-4 px-6">
        <h1 className="font-display font-black text-6xl md:text-8xl tracking-tight text-charcoal-900">
          Barbeyond
        </h1>
        <p className="font-body text-sm tracking-[0.3em] uppercase text-oldGold-600">
          By Hazen Gülfırat
        </p>
        <p className="font-body text-sm text-charcoal-300 mt-8">
          FAZ 0 — Proje iskeleti hazır.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPlaceholder />} />
      <Route path="*" element={<LandingPlaceholder />} />
    </Routes>
  );
}
