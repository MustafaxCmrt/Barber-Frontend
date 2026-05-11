import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Home,
  KeyRound,
  Search,
  ShieldAlert,
} from "lucide-react";
import { notify } from "@/lib/toast";

/**
 * Pre-prod sözleşmesi (Bölüm 1.1, 13.2) — başarı sayfası.
 *
 * Randevu numarası query string'ten okunur (paylaşılabilir, bookmark dostu).
 * Cancellation code ise:
 *   1) React Router location.state.cancellationCode (öncelikli)
 *   2) sessionStorage `barbeyond.cancellationCode.{id}` (refresh fallback)
 * Code bir kez döner — kullanıcıya kalıcı kart + kopyala butonu ile veriyoruz.
 *
 * `id` yoksa landing'e replace ile yönlendir.
 */
export function AppointmentSuccessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const id = searchParams.get("id");

  const stateCode =
    (location.state as { cancellationCode?: string } | null)
      ?.cancellationCode ?? null;

  const [cancellationCode, setCancellationCode] = useState<string | null>(
    stateCode,
  );
  const [copied, setCopied] = useState(false);

  // SessionStorage fallback: refresh sonrası state kaybolur, storage taşır.
  useEffect(() => {
    if (!id) return;
    if (cancellationCode) return;
    try {
      const stored = window.sessionStorage.getItem(
        `barbeyond.cancellationCode.${id}`,
      );
      if (stored) setCancellationCode(stored);
    } catch {
      // private mode — yut.
    }
  }, [id, cancellationCode]);

  if (!id) {
    return <Navigate to="/" replace />;
  }

  const handleCopy = async () => {
    if (!cancellationCode) return;
    try {
      await navigator.clipboard.writeText(cancellationCode);
      setCopied(true);
      notify.success("İptal kodu kopyalandı");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Kopyalanamadı, manuel olarak not alın");
    }
  };

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

        {cancellationCode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="rounded-xl border-2 border-oldGold-300 bg-oldGold-50/80 p-5 text-left space-y-3"
            role="region"
            aria-labelledby="cancellation-code-heading"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert
                className="w-5 h-5 text-oldGold-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p
                  id="cancellation-code-heading"
                  className="font-display text-base text-charcoal-900"
                >
                  İptal kodunuz
                </p>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Bu kod <strong>tekrar gösterilmeyecek</strong>. Lütfen
                  kaydedin — randevunuzu iptal etmek için gerekli.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-white border border-oldGold-200 px-4 py-3 flex items-center gap-3">
                <KeyRound
                  className="w-4 h-4 text-oldGold-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="font-mono text-2xl tracking-[0.4em] text-charcoal-900 select-all">
                  {cancellationCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center p-3 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-oldGold-500/40"
                aria-label={copied ? "Kopyalandı" : "Kodu kopyala"}
                title={copied ? "Kopyalandı" : "Kopyala"}
              >
                {copied ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Copy className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </motion.div>
        )}

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
