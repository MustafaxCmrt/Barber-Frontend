import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Loader2,
  Scissors,
  Search,
  X,
} from "lucide-react";

import { useAssignServicesMutation } from "@/features/admin/barbersQueries";
import { usePublicServices } from "@/features/public/queries";
import { Skeleton } from "@/components/Skeleton";
import { formatDuration, formatMoney } from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";

/**
 * FAZ 8 / M1 — Berbere hizmet atama modalı (Bölüm 7.1 + 8.5[5-6]).
 *
 * Liste public /api/public/services'ten gelir (sadece aktif hizmetler).
 * FAZ 9'da admin /api/Services endpoint'i geldiğinde IsActive filtreli
 * admin listesine geçirilebilir.
 *
 * Boş seçim de geçerli (backend "tüm atamalar kaldırıldı" döner).
 */

interface Props {
  isOpen: boolean;
  barberId: string;
  currentServiceIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceAssignModal({
  isOpen,
  barberId,
  currentServiceIds,
  onClose,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const services = usePublicServices({ Page: 1, PageSize: 50 });
  const mutation = useAssignServicesMutation();

  // Modal açıldığında local state'i mevcut atamalardan başlat
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(currentServiceIds));
      setSearch("");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Esc ile kapama
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mutation.isPending, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const items = services.data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? items.filter((s) => s.name.toLowerCase().includes(q))
      : items;
  }, [items, search]);

  const initialSet = useMemo(
    () => new Set(currentServiceIds),
    [currentServiceIds],
  );
  const isDirty = useMemo(() => {
    if (selected.size !== initialSet.size) return true;
    for (const id of selected) if (!initialSet.has(id)) return true;
    return false;
  }, [selected, initialSet]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    mutation.mutate(
      { id: barberId, body: { serviceIds: Array.from(selected) } },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "Hizmetler güncellendi.");
          onSaved();
          onClose();
        },
        onError: (err) => {
          notify.error(
            isApiError(err) ? err.message : "Hizmetler güncellenemedi.",
          );
        },
      },
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-assign-title"
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!mutation.isPending) onClose();
            }}
            className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl bg-white shadow-card-hover border border-charcoal-100"
          >
            <header className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-oldGold-600">
                    Hizmet Ata
                  </p>
                  <h2
                    id="service-assign-title"
                    className="font-display text-xl text-charcoal-900"
                  >
                    Sunulan hizmetleri seç
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={mutation.isPending}
                className="p-1.5 rounded-lg text-charcoal-300 hover:text-charcoal-900 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Search */}
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hizmet ara…"
                  aria-label="Hizmet ara"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-500 placeholder:text-charcoal-200 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              {services.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : services.isError ? (
                <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-statusBusy mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-charcoal-900 font-medium">
                      Hizmetler yüklenemedi
                    </p>
                    <button
                      type="button"
                      onClick={() => services.refetch()}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-charcoal-300 py-8">
                  {search
                    ? "Aramaya uyan hizmet yok."
                    : "Sistemde aktif hizmet yok."}
                </p>
              ) : (
                <ul className="divide-y divide-charcoal-100">
                  {filtered.map((s) => {
                    const checked = selected.has(s.id);
                    return (
                      <li key={s.id}>
                        <label
                          className={`flex items-center justify-between gap-3 py-3 cursor-pointer rounded-lg px-2 -mx-2 hover:bg-charcoal-50/60 transition-colors ${
                            checked ? "bg-oldGold-50/40" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`w-5 h-5 mt-0.5 flex-shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                                checked
                                  ? "bg-oldGold-500 border-oldGold-500 text-white"
                                  : "border-charcoal-200 bg-white"
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggle(s.id)}
                              disabled={mutation.isPending}
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-charcoal-900 truncate">
                                {s.name}
                              </p>
                              <p className="text-xs text-charcoal-300">
                                {formatDuration(s.durationMinutes)}
                              </p>
                            </div>
                          </div>
                          <div className="font-display text-charcoal-900 tabular-nums text-sm">
                            {formatMoney(s.price)}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-charcoal-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-charcoal-300">
                {selected.size} hizmet seçildi
                {isDirty && (
                  <span className="ml-2 text-oldGold-600">
                    · değişiklikler kaydedilmedi
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={mutation.isPending}
                  className="px-4 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={mutation.isPending || !isDirty}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Kaydet
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
