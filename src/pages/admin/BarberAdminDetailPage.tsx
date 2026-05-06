import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
  UserMinus,
} from "lucide-react";

import {
  useAdminBarberDetail,
  useDeleteBarberMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ServiceAssignModal } from "@/components/ServiceAssignModal";
import { BarberScheduleEditor } from "@/components/BarberScheduleEditor";
import { BarberLeavesTab } from "@/components/BarberLeavesTab";
import { EmptyState } from "@/components/EmptyState";
import { formatDuration, formatMoney, formatUtcDateTime } from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import {
  getBarberPhoto,
  getBarberPhotoOnError,
} from "@/lib/imageFallbacks";
import type { BarberDetailDto } from "@/api/types";

/**
 * FAZ 8 / M1 — Berber detay (sekmeli) (Bölüm 7.1 + 8.5).
 *
 * Sekmeler:
 *  - Bilgiler  (read-only + [Düzenle] linki + [Sil])      ← M1
 *  - Hizmetler (atanan hizmetler + [Düzenle] modal)       ← M1
 *  - Çalışma Takvimi                                      ← M2
 *  - İzin Günleri                                         ← M2
 */

type Tab = "info" | "services" | "schedule" | "leaves";

interface TabDef {
  id: Tab;
  label: string;
  icon: typeof Info;
}

const TABS: TabDef[] = [
  { id: "info", label: "Bilgiler", icon: Info },
  { id: "services", label: "Hizmetler", icon: Scissors },
  { id: "schedule", label: "Çalışma Takvimi", icon: CalendarDays },
  { id: "leaves", label: "İzin Günleri", icon: UserMinus },
];

export function BarberAdminDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  if (!id) return <Navigate to="/admin/barbers" replace />;
  return <BarberAdminDetailContent id={id} />;
}

function BarberAdminDetailContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const detail = useAdminBarberDetail(id);
  const deleteMutation = useDeleteBarberMutation();

  const [tab, setTab] = useState<Tab>("info");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const data = detail.data;

  const handleDelete = () => {
    setDeleteError(null);
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          notify.success(`${data?.fullName ?? "Berber"} silindi.`);
          setConfirmDelete(false);
          navigate("/admin/barbers", { replace: true });
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
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <Link
        to="/admin/barbers"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-oldGold-600"
      >
        <ArrowLeft className="w-4 h-4" />
        Berber listesi
      </Link>

      {/* Header card */}
      {detail.isLoading ? (
        <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      ) : detail.isError || !data ? (
        <div className="rounded-2xl bg-white border border-statusBusy/30 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal-900">
              Berber yüklenemedi
            </p>
            <p className="text-xs text-charcoal-300 mt-1">
              {detail.error?.message ?? "Lütfen tekrar deneyin."}
            </p>
            <button
              type="button"
              onClick={() => detail.refetch()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tekrar Dene
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 md:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={getBarberPhoto(data.photoUrl, data.id)}
                alt={data.fullName}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback) return;
                  img.dataset.fallback = "1";
                  img.src = getBarberPhotoOnError(data.id);
                }}
                className="w-20 h-20 rounded-full object-cover bg-charcoal-100"
              />
              <div>
                <h1 className="font-display text-2xl text-charcoal-900">
                  {data.fullName}
                </h1>
                <p className="text-sm text-charcoal-500">
                  {data.specialty ?? "—"}
                </p>
                <div className="mt-1.5">
                  <ActiveBadge active={data.isActive} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/admin/barbers/${id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-charcoal-100 hover:border-oldGold-500 hover:text-oldGold-600 text-charcoal-500 text-sm font-medium transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Düzenle
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-statusBusy/40 text-statusBusy hover:bg-statusBusy/5 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      {data && (
        <>
          <nav
            role="tablist"
            aria-label="Berber sekmeleri"
            className="flex flex-wrap gap-1 bg-white border border-charcoal-100 rounded-2xl p-1 shadow-card"
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-charcoal-900 text-white"
                      : "text-charcoal-500 hover:text-oldGold-600 hover:bg-charcoal-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div role="tabpanel">
            {tab === "info" && <InfoTab data={data} />}
            {tab === "services" && (
              <ServicesTab
                data={data}
                onOpenAssign={() => setAssignOpen(true)}
              />
            )}
            {tab === "schedule" && (
              <BarberScheduleEditor barberId={data.id} />
            )}
            {tab === "leaves" && <BarberLeavesTab barberId={data.id} />}
          </div>
        </>
      )}

      {/* Modals */}
      {data && (
        <ServiceAssignModal
          isOpen={assignOpen}
          barberId={data.id}
          currentServiceIds={data.services.map((s) => s.id)}
          onClose={() => setAssignOpen(false)}
          onSaved={() => detail.refetch()}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete}
        title="Berberi sil"
        description={
          data ? (
            <>
              <strong className="text-charcoal-900">{data.fullName}</strong>{" "}
              isimli berberi silmek üzeresin. Bu işlem geri alınamaz.
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
            setConfirmDelete(false);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}

// ============================================================
// Tab: Bilgiler
// ============================================================

function InfoTab({ data }: { data: BarberDetailDto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 space-y-5"
    >
      <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
        <Info className="w-5 h-5 text-oldGold-600" />
        Bilgiler
      </h2>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <Field label="Ad Soyad" value={data.fullName} />
        <Field label="Uzmanlık" value={data.specialty ?? "—"} />
        <Field
          label="Durum"
          value={data.isActive ? "Aktif" : "Pasif"}
        />
        <Field
          label="Oluşturma"
          value={formatUtcDateTime(data.createdAt)}
        />
        <Field
          label="Son Güncelleme"
          value={formatUtcDateTime(data.updatedAt)}
        />
      </dl>

      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-2">
          Biyografi
        </p>
        <p className="text-sm text-charcoal-900 whitespace-pre-wrap">
          {data.bio ?? "—"}
        </p>
      </div>
    </motion.div>
  );
}

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-0.5">
        {label}
      </dt>
      <dd className="text-charcoal-900 break-words">{value}</dd>
    </div>
  );
}

// ============================================================
// Tab: Hizmetler
// ============================================================

function ServicesTab({
  data,
  onOpenAssign,
}: {
  data: BarberDetailDto;
  onOpenAssign: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden"
    >
      <header className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
        <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-oldGold-600" />
          Sunulan Hizmetler
          <span className="text-sm text-charcoal-300 font-normal">
            ({data.services.length})
          </span>
        </h2>
        <button
          type="button"
          onClick={onOpenAssign}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Düzenle
        </button>
      </header>

      {data.services.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Atanmış hizmet yok"
            description="Bu berberin müşterilere sunabileceği hizmeti seç."
            action={
              <button
                type="button"
                onClick={onOpenAssign}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Hizmet Ata
              </button>
            }
          />
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Hizmet</th>
              <th className="text-right px-6 py-3 font-medium">Süre</th>
              <th className="text-right px-6 py-3 font-medium">Fiyat</th>
              <th className="text-left px-6 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {data.services.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-3 text-charcoal-900">{s.name}</td>
                <td className="px-6 py-3 text-right text-charcoal-500 tabular-nums">
                  {formatDuration(s.durationMinutes)}
                </td>
                <td className="px-6 py-3 text-right font-display text-charcoal-900 tabular-nums">
                  {formatMoney(s.price)}
                </td>
                <td className="px-6 py-3">
                  <ActiveBadge active={s.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  );
}

// ============================================================
// Shared
// ============================================================

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
