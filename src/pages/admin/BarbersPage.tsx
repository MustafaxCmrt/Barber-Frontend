import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Eye,
  FilterX,
  GripVertical,
  ListOrdered,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  useAdminBarbers,
  useDeleteBarberMutation,
  useUpdateBarberDisplayOrderMutation,
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
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderedItems, setOrderedItems] = useState<BarberSummaryDto[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
  const orderQuery: AdminBarbersQuery = useMemo(
    () => ({ Page: 1, PageSize: 200 }),
    [],
  );
  const orderBarbers = useAdminBarbers(orderQuery);
  const deleteMutation = useDeleteBarberMutation();
  const orderMutation = useUpdateBarberDisplayOrderMutation();

  const isFiltered = !!debouncedSearch || activeFilter !== "all";
  const items = barbers.data?.items ?? [];
  const visibleItems = isOrdering ? orderedItems : items;
  const visibleData = isOrdering ? orderBarbers.data : barbers.data;
  const visibleError = isOrdering ? orderBarbers.error : barbers.error;
  const isTableLoading = isOrdering
    ? orderBarbers.isLoading
    : barbers.isLoading;
  const isTableError = isOrdering ? orderBarbers.isError : barbers.isError;
  const isOrderListTruncated =
    isOrdering &&
    !!orderBarbers.data &&
    orderBarbers.data.totalCount > orderedItems.length;

  useEffect(() => {
    if (!isOrdering || orderedItems.length > 0 || !orderBarbers.data) return;
    setOrderedItems(sortForDisplayOrder(orderBarbers.data.items));
  }, [isOrdering, orderBarbers.data, orderedItems.length]);

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

  const handleStartOrdering = () => {
    setOrderedItems(
      orderBarbers.data ? sortForDisplayOrder(orderBarbers.data.items) : [],
    );
    setIsOrdering(true);
  };

  const handleCancelOrdering = () => {
    setIsOrdering(false);
    setOrderedItems([]);
    setDraggedId(null);
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    setOrderedItems((prev) => {
      const from = prev.findIndex((item) => item.id === id);
      if (from < 0) return prev;
      return moveItem(prev, from, from + direction);
    });
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrderedItems((prev) => {
      const from = prev.findIndex((item) => item.id === draggedId);
      const to = prev.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return prev;
      return moveItem(prev, from, to);
    });
    setDraggedId(null);
  };

  const handleSaveOrder = () => {
    if (orderedItems.length === 0 || isOrderListTruncated) return;
    orderMutation.mutate(
      { barberIds: orderedItems.map((barber) => barber.id) },
      {
        onSuccess: () => {
          notify.success("Müşteri görünüm sırası kaydedildi.");
          setIsOrdering(false);
          setOrderedItems([]);
          setDraggedId(null);
        },
        onError: (err) => {
          notify.error(
            isApiError(err)
              ? err.message
              : "Sıralama kaydedilemedi.",
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
          {isOrdering ? (
            <>
              <button
                type="button"
                onClick={handleCancelOrdering}
                disabled={orderMutation.isPending}
                title="Sıralamayı iptal et"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-statusBusy/40 hover:text-statusBusy disabled:opacity-60 transition-colors"
                aria-label="Sıralamayı iptal et"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={
                  orderMutation.isPending ||
                  orderedItems.length === 0 ||
                  isOrderListTruncated
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {orderMutation.isPending ? "Kaydediliyor…" : "Sırayı Kaydet"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartOrdering}
              disabled={orderBarbers.isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
            >
              <ListOrdered className="w-4 h-4" />
              Sıralama
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              isOrdering ? orderBarbers.refetch() : barbers.refetch()
            }
            disabled={isOrdering ? orderBarbers.isFetching : barbers.isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
            aria-label="Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                (isOrdering ? orderBarbers.isFetching : barbers.isFetching)
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
          {!isOrdering && (
            <Link
              to="/admin/barbers/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Berber
            </Link>
          )}
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
            {visibleData ? (
              <>
                {isOrdering ? "Sıralanan" : "Toplam"}{" "}
                <span className="text-charcoal-900 font-medium">
                  {isOrdering ? orderedItems.length : visibleData.totalCount}
                </span>{" "}
                berber
              </>
            ) : (
              "Yükleniyor…"
            )}
          </div>
          {isOrdering && (
            <div className="text-xs text-charcoal-300">
              Müşteri tarafındaki görünüm sırası
            </div>
          )}
        </header>

        {isOrderListTruncated && (
          <div className="mx-5 md:mx-6 mt-4 rounded-xl border border-statusBusy/30 bg-red-50 p-4 text-sm text-statusBusy">
            Liste 200 berberle sınırlandı. Tüm sırayı güvenli kaydetmek için
            backend'de daha yüksek sayfa boyutu veya özel sıralama endpoint'i
            gerekir.
          </div>
        )}

        {isTableLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : isTableError ? (
          <div className="p-6">
            <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-charcoal-900">
                  Berberler yüklenemedi
                </p>
                <p className="text-xs text-charcoal-300 mt-1">
                  {visibleError?.message ?? "Lütfen tekrar deneyin."}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    isOrdering ? orderBarbers.refetch() : barbers.refetch()
                  }
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                isOrdering
                  ? "Sıralanacak berber yok"
                  : isFiltered
                    ? "Filtrelere uyan berber yok"
                    : "Henüz berber yok"
              }
              description={
                isOrdering
                  ? "Henüz listeye alınmış berber bulunmuyor."
                  : isFiltered
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
                    {isOrdering && (
                      <th className="text-left px-5 py-3 font-medium">Sıra</th>
                    )}
                    <th className="text-left px-5 py-3 font-medium">Berber</th>
                    <th className="text-left px-5 py-3 font-medium">Uzmanlık</th>
                    <th className="text-left px-5 py-3 font-medium">Durum</th>
                    <th className="text-right px-5 py-3 font-medium">
                      {isOrdering ? "Taşı" : "Aksiyon"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {visibleItems.map((b, index) => (
                    <tr
                      key={b.id}
                      draggable={isOrdering && !orderMutation.isPending}
                      onDragStart={() => setDraggedId(b.id)}
                      onDragOver={(event) => {
                        if (isOrdering) event.preventDefault();
                      }}
                      onDrop={() => handleDrop(b.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`hover:bg-charcoal-50/50 transition-colors ${
                        draggedId === b.id ? "opacity-50" : ""
                      } ${isOrdering ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      {isOrdering && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 text-charcoal-500">
                            <GripVertical className="w-4 h-4 text-charcoal-200" />
                            <span className="font-display text-charcoal-900 tabular-nums">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                      )}
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
                          {isOrdering ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMove(b.id, -1)}
                                disabled={index === 0 || orderMutation.isPending}
                                title="Yukarı taşı"
                                aria-label={`${b.fullName} yukarı taşı`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-500 hover:text-oldGold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMove(b.id, 1)}
                                disabled={
                                  index === visibleItems.length - 1 ||
                                  orderMutation.isPending
                                }
                                title="Aşağı taşı"
                                aria-label={`${b.fullName} aşağı taşı`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-500 hover:text-oldGold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isOrdering && barbers.data && (
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

function sortForDisplayOrder(items: BarberSummaryDto[]): BarberSummaryDto[] {
  return [...items].sort((a, b) => {
    const aOrder = a.displayOrder;
    const bOrder = b.displayOrder;
    const aHasOrder = typeof aOrder === "number";
    const bHasOrder = typeof bOrder === "number";

    if (aHasOrder && bHasOrder) return aOrder - bOrder;
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return 0;
  });
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const boundedTo = Math.max(0, Math.min(items.length - 1, to));
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(boundedTo, 0, item);
  return next;
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
