import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2,
  UserMinus,
} from "lucide-react";

import {
  useBarberLeaves,
  useDeleteBarberLeaveMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { AddLeaveModal } from "@/components/AddLeaveModal";
import { addDays, formatDate, formatUtcDateTime, toDateOnly } from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import type { BarberLeaveDto } from "@/api/types";

/**
 * FAZ 8 / M2 — İzin Günleri tab (Bölüm 7.1).
 *
 * Default range: bugün → +60 gün. Kullanıcı tarih aralığını değiştirebilir
 * (geçmiş izinleri görmek için).
 *
 * - GET /api/Barbers/{id}/leaves?from&to
 * - POST /api/Barbers/{id}/leaves (modal)
 * - DELETE /api/Barbers/{id}/leaves/{leaveId}
 */

interface Props {
  barberId: string;
}

export function BarberLeavesTab({ barberId }: Props) {
  const today = useMemo(() => toDateOnly(new Date()), []);
  const defaultTo = useMemo(() => toDateOnly(addDays(60)), []);

  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(defaultTo);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BarberLeaveDto | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const leaves = useBarberLeaves(barberId, { from, to });
  const deleteMutation = useDeleteBarberLeaveMutation();

  const sorted = useMemo(
    () =>
      [...(leaves.data ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [leaves.data],
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(
      { id: barberId, leaveId: deleteTarget.id },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "İzin günü silindi.");
          setDeleteTarget(null);
        },
        onError: (err) => {
          setDeleteError(
            isApiError(err) ? err.message : "İzin silinemedi.",
          );
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden"
    >
      <header className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
          <UserMinus className="w-5 h-5 text-oldGold-600" />
          İzin Günleri
        </h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          İzin Ekle
        </button>
      </header>

      <div className="px-6 py-4 border-b border-charcoal-100 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="leaves-from"
            className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1"
          >
            Başlangıç
          </label>
          <input
            id="leaves-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="leaves-to"
            className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1"
          >
            Bitiş
          </label>
          <input
            id="leaves-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => leaves.refetch()}
          disabled={leaves.isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${leaves.isFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Yenile</span>
        </button>
      </div>

      {leaves.isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : leaves.isError ? (
        <div className="p-6">
          <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal-900">
                İzinler yüklenemedi
              </p>
              <p className="text-xs text-charcoal-300 mt-1">
                {leaves.error?.message ?? "Lütfen tekrar deneyin."}
              </p>
              <button
                type="button"
                onClick={() => leaves.refetch()}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Bu aralıkta izin yok"
            description="Tarih aralığını genişletebilir veya yeni izin ekleyebilirsin."
            action={
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> İzin Ekle
              </button>
            }
          />
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Tarih</th>
              <th className="text-left px-6 py-3 font-medium">Sebep</th>
              <th className="text-left px-6 py-3 font-medium">Eklendi</th>
              <th className="text-right px-6 py-3 font-medium">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {sorted.map((l) => (
              <tr key={l.id} className="hover:bg-charcoal-50/50 transition-colors">
                <td className="px-6 py-3 text-charcoal-900 tabular-nums">
                  {formatDate(l.date)}
                </td>
                <td className="px-6 py-3 text-charcoal-500">
                  {l.reason ?? "—"}
                </td>
                <td className="px-6 py-3 text-charcoal-300 text-xs">
                  {formatUtcDateTime(l.createdAt)}
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(l);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-statusBusy/40 text-statusBusy hover:bg-statusBusy/5 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddLeaveModal
        isOpen={addOpen}
        barberId={barberId}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          /* hook invalidate ediyor; ekstra refetch gerekmez */
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="İzin gününü sil"
        description={
          deleteTarget ? (
            <>
              <strong className="text-charcoal-900">
                {formatDate(deleteTarget.date)}
              </strong>{" "}
              tarihli izin silinecek.
            </>
          ) : (
            ""
          )
        }
        isPending={deleteMutation.isPending}
        errorMessage={deleteError}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </motion.div>
  );
}
