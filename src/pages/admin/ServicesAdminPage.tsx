import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  FilterX,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
} from "lucide-react";

import {
  useAdminServices,
  useDeleteServiceMutation,
} from "@/features/admin/servicesQueries";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ServiceFormModal } from "@/components/ServiceFormModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDuration, formatMoney } from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import type {
  AdminServicesQuery,
  ServiceSummaryDto,
} from "@/api/types";

/**
 * FAZ 9 — Admin Hizmet Yönetimi (Bölüm 7.2).
 *
 * Filtre: Search (debounced) + IsActive (Tümü / Aktif / Pasif).
 * Aksiyonlar: [Düzenle] [Sil] + üstte [Yeni Hizmet].
 * Yeni / Düzenle aynı `ServiceFormModal` komponentini kullanıyor.
 */

const PAGE_SIZE = 10;

type ActiveFilter = "all" | "active" | "inactive";

export function ServicesAdminPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<ServiceSummaryDto | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ServiceSummaryDto | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const query: AdminServicesQuery = useMemo(() => {
    const q: AdminServicesQuery = { Page: page, PageSize: PAGE_SIZE };
    if (debouncedSearch) q.Search = debouncedSearch;
    if (activeFilter === "active") q.IsActive = true;
    if (activeFilter === "inactive") q.IsActive = false;
    return q;
  }, [page, debouncedSearch, activeFilter]);

  const services = useAdminServices(query);
  const deleteMutation = useDeleteServiceMutation();

  const isFiltered = !!debouncedSearch || activeFilter !== "all";
  const items = services.data?.items ?? [];

  const handleResetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setPage(1);
  };

  const openCreate = () => {
    setFormTarget(null);
    setFormOpen(true);
  };

  const openEdit = (svc: ServiceSummaryDto) => {
    setFormTarget(svc);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    // Animation bitsin sonra target'ı temizle
    setTimeout(() => setFormTarget(null), 200);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          notify.success(`${deleteTarget.name} silindi.`);
          setDeleteTarget(null);
        },
        onError: (err) => {
          setDeleteError(
            isApiError(err) ? err.message : "Silme işlemi başarısız oldu.",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-charcoal-900 flex items-center gap-2">
            <Scissors className="w-7 h-7 text-oldGold-600" />
            Hizmetler
          </h1>
          <p className="text-sm text-charcoal-300 mt-1">
            Sunulan hizmetleri yönet — fiyat, süre, aktiflik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => services.refetch()}
            disabled={services.isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
            aria-label="Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 ${services.isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Hizmet
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:justify-between"
      >
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Hizmet ara…"
            ariaLabel="Hizmet ara"
          />
          <div role="radiogroup" className="inline-flex bg-white rounded-lg border border-charcoal-100 p-1">
            {(
              [
                { v: "all", label: "Tümü" },
                { v: "active", label: "Aktif" },
                { v: "inactive", label: "Pasif" },
              ] as const
            ).map((opt) => {
              const active = activeFilter === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setActiveFilter(opt.v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? "bg-charcoal-900 text-white"
                      : "text-charcoal-500 hover:text-oldGold-600"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-statusBusy/40 hover:text-statusBusy text-xs font-medium transition-colors self-start md:self-auto"
          >
            <FilterX className="w-3.5 h-3.5" />
            Filtreleri Temizle
          </button>
        )}
      </motion.div>

      <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden">
        <header className="px-5 md:px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3 text-sm">
          <div className="text-charcoal-300">
            {services.data ? (
              <>
                Toplam{" "}
                <span className="text-charcoal-900 font-medium">
                  {services.data.totalCount}
                </span>{" "}
                hizmet
              </>
            ) : (
              "Yükleniyor…"
            )}
          </div>
        </header>

        {services.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : services.isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-charcoal-900">
                  Hizmetler yüklenemedi
                </p>
                <p className="text-xs text-charcoal-300 mt-1">
                  {services.error?.message ?? "Lütfen tekrar deneyin."}
                </p>
                <button
                  type="button"
                  onClick={() => services.refetch()}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                isFiltered ? "Filtrelere uyan hizmet yok" : "Henüz hizmet yok"
              }
              description={
                isFiltered
                  ? "Filtreleri gevşetmeyi deneyin."
                  : "İlk hizmeti ekleyerek başla."
              }
              action={
                !isFiltered ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Yeni Hizmet
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Hizmet</th>
                    <th className="text-right px-5 py-3 font-medium">Süre</th>
                    <th className="text-right px-5 py-3 font-medium">Fiyat</th>
                    <th className="text-left px-5 py-3 font-medium">Durum</th>
                    <th className="text-right px-5 py-3 font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {items.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-charcoal-50/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-charcoal-900">{s.name}</td>
                      <td className="px-5 py-3 text-right text-charcoal-500 tabular-nums">
                        {formatDuration(s.durationMinutes)}
                      </td>
                      <td className="px-5 py-3 text-right font-display text-charcoal-900 tabular-nums">
                        {formatMoney(s.price)}
                      </td>
                      <td className="px-5 py-3">
                        <ActiveBadge active={s.isActive} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-charcoal-100 hover:border-oldGold-500 hover:text-oldGold-600 text-charcoal-500 text-xs font-medium transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(s);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-statusBusy/40 text-statusBusy hover:bg-statusBusy/5 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {services.data && (
              <div className="px-5 md:px-6 py-4 border-t border-charcoal-100">
                <Pagination
                  page={services.data.page}
                  pageSize={services.data.pageSize}
                  totalPages={services.data.totalPages}
                  totalCount={services.data.totalCount}
                  hasNext={services.data.hasNext}
                  hasPrevious={services.data.hasPrevious}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ServiceFormModal
        isOpen={formOpen}
        service={formTarget}
        onClose={closeForm}
        onSaved={() => {
          /* hook invalidate ediyor */
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Hizmeti sil"
        description={
          deleteTarget ? (
            <>
              <strong className="text-charcoal-900">{deleteTarget.name}</strong>{" "}
              isimli hizmeti silmek üzeresin. Bu işlem geri alınamaz.
            </>
          ) : (
            ""
          )
        }
        isPending={deleteMutation.isPending}
        errorMessage={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${
        active
          ? "bg-statusAvailable/10 text-green-700 ring-statusAvailable/30"
          : "bg-charcoal-100 text-charcoal-300 ring-charcoal-200/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-statusAvailable" : "bg-charcoal-200"}`}
      />
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}
