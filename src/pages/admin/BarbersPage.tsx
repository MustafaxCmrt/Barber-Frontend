import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  FilterX,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

import {
  useAdminBarbers,
  useDeleteBarberMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useDebounce } from "@/hooks/useDebounce";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import {
  getBarberPhoto,
  getBarberPhotoOnError,
} from "@/lib/imageFallbacks";
import type {
  AdminBarbersQuery,
  BarberSummaryDto,
} from "@/api/types";

/**
 * FAZ 8 / M1 — Admin Berber Listesi (Bölüm 7.1 + 8.5).
 *
 * Filtre: Search (debounced) + IsActive (Tümü / Aktif / Pasif).
 * Aksiyonlar: [Detay] [Düzenle] [Sil] + üstte [Yeni Berber].
 * Sil → ConfirmDeleteModal + useDeleteBarberMutation.
 */

const PAGE_SIZE = 10;

type ActiveFilter = "all" | "active" | "inactive";

export function BarbersPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BarberSummaryDto | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const query: AdminBarbersQuery = useMemo(() => {
    const q: AdminBarbersQuery = { Page: page, PageSize: PAGE_SIZE };
    if (debouncedSearch) q.Search = debouncedSearch;
    if (activeFilter === "active") q.IsActive = true;
    if (activeFilter === "inactive") q.IsActive = false;
    return q;
  }, [page, debouncedSearch, activeFilter]);

  const barbers = useAdminBarbers(query);
  const deleteMutation = useDeleteBarberMutation();

  const isFiltered = !!debouncedSearch || activeFilter !== "all";
  const items = barbers.data?.items ?? [];

  const handleResetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setPage(1);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          notify.success(`${deleteTarget.fullName} silindi.`);
          setDeleteTarget(null);
        },
        onError: (err) => {
          setDeleteError(
            isApiError(err)
              ? err.message
              : "Silme işlemi başarısız oldu.",
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
            <Users className="w-7 h-7 text-oldGold-600" />
            Berberler
          </h1>
          <p className="text-sm text-charcoal-300 mt-1">
            Berberleri yönet — bilgi, hizmet, çalışma takvimi ve izinler.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => barbers.refetch()}
            disabled={barbers.isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
            aria-label="Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 ${barbers.isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            to="/admin/barbers/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Berber
          </Link>
        </div>
      </header>

      {/* Filter row */}
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
            placeholder="Ad, uzmanlık ile ara…"
            ariaLabel="Berber ara"
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

      {/* Table card */}
      <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden">
        <header className="px-5 md:px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3 text-sm">
          <div className="text-charcoal-300">
            {barbers.data ? (
              <>
                Toplam{" "}
                <span className="text-charcoal-900 font-medium">
                  {barbers.data.totalCount}
                </span>{" "}
                berber
              </>
            ) : (
              "Yükleniyor…"
            )}
          </div>
        </header>

        {barbers.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : barbers.isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-charcoal-900">
                  Berberler yüklenemedi
                </p>
                <p className="text-xs text-charcoal-300 mt-1">
                  {barbers.error?.message ?? "Lütfen tekrar deneyin."}
                </p>
                <button
                  type="button"
                  onClick={() => barbers.refetch()}
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
                isFiltered ? "Filtrelere uyan berber yok" : "Henüz berber yok"
              }
              description={
                isFiltered
                  ? "Filtreleri gevşetmeyi deneyin."
                  : "İlk berberi ekleyerek başlayın."
              }
              action={
                !isFiltered ? (
                  <Link
                    to="/admin/barbers/new"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Yeni Berber
                  </Link>
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
                    <th className="text-left px-5 py-3 font-medium">Berber</th>
                    <th className="text-left px-5 py-3 font-medium">Uzmanlık</th>
                    <th className="text-left px-5 py-3 font-medium">Durum</th>
                    <th className="text-right px-5 py-3 font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {items.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-charcoal-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getBarberPhoto(b.photoUrl, b.id)}
                            alt={b.fullName}
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallback) return;
                              img.dataset.fallback = "1";
                              img.src = getBarberPhotoOnError(b.id);
                            }}
                            className="w-10 h-10 rounded-full object-cover bg-charcoal-100 flex-shrink-0"
                          />
                          <span className="text-charcoal-900">{b.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-charcoal-500">
                        {b.specialty ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <ActiveBadge active={b.isActive} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/barbers/${b.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-charcoal-100 hover:border-oldGold-500 hover:text-oldGold-600 text-charcoal-500 text-xs font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detay
                          </Link>
                          <Link
                            to={`/admin/barbers/${b.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-charcoal-100 hover:border-oldGold-500 hover:text-oldGold-600 text-charcoal-500 text-xs font-medium transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Düzenle
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(b);
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

            {barbers.data && (
              <div className="px-5 md:px-6 py-4 border-t border-charcoal-100">
                <Pagination
                  page={barbers.data.page}
                  pageSize={barbers.data.pageSize}
                  totalPages={barbers.data.totalPages}
                  totalCount={barbers.data.totalCount}
                  hasNext={barbers.data.hasNext}
                  hasPrevious={barbers.data.hasPrevious}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Berberi sil"
        description={
          deleteTarget ? (
            <>
              <strong className="text-charcoal-900">
                {deleteTarget.fullName}
              </strong>{" "}
              isimli berberi silmek üzeresin. Bu işlem geri alınamaz.
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
