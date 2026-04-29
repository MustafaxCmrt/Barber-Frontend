import { Construction } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface AdminPlaceholderPageProps {
  label: string;
  phase: string;
  description?: string;
}

/**
 * Admin sayfaları henüz hazır değilken sidebar'dan gelen tıklamalar için
 * geçici placeholder. Faz tamamlanıp ilgili sayfa devreye girince route
 * gerçek component'e bağlanır.
 */
export function AdminPlaceholderPage({
  label,
  phase,
  description,
}: AdminPlaceholderPageProps) {
  const username = useAuthStore((s) => s.username);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
          <Construction className="w-6 h-6" />
        </div>
        <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-600">
          {phase}
        </p>
        <h1 className="font-display text-3xl text-charcoal-900">{label}</h1>
        <p className="text-charcoal-500 max-w-md mx-auto">
          {description ??
            `${label} sayfası ${phase}'de hayata geçecek. Auth + layout iskelesi hazır, sayfa içeriği bir sonraki fazda.`}
        </p>
        <p className="text-xs text-charcoal-300">
          Giriş: <span className="text-charcoal-500">{username ?? "—"}</span>
        </p>
      </div>
    </div>
  );
}
