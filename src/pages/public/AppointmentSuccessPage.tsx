import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Home, Search } from "lucide-react";

/**
 * FAZ 3 — başarı sayfası (Bölüm 8.1[10]).
 * Randevu numarası query string'ten okunur.
 * Yoksa landing'e replace ile yönlendirilir.
 */
export function AppointmentSuccessPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-8 md:p-12 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="mx-auto w-20 h-20 rounded-full bg-oldGold-50 flex items-center justify-center"
          aria-hidden="true"
        >
          <CheckCircle2 className="w-12 h-12 text-oldGold-500" strokeWidth={1.5} />
        </motion.div>

        <div className="space-y-2">
          <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-600">
            Onaylandı
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-charcoal-900">
            Randevunuz oluşturuldu
          </h1>
          <p className="text-charcoal-300 max-w-md mx-auto">
            Görüşmek üzere. Kısa süre içinde randevunuz hazır olacak.
          </p>
        </div>

        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-5 text-left space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-charcoal-300">
            Randevu Numarası
          </p>
          <p className="font-mono text-sm md:text-base text-charcoal-900 break-all">
            {id}
          </p>
          <p className="text-xs text-charcoal-300">
            Bu numarayı saklayın — randevunuzu sorgularken veya iptal ederken
            gerekecek.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to={`/randevumu-bul?id=${encodeURIComponent(id)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            Randevu Sorgula
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-charcoal-100 hover:border-oldGold-300 text-charcoal-500 hover:text-oldGold-600 font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Anasayfa
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
