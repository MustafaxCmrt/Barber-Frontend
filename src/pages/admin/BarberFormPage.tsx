import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Crop,
  ImagePlus,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
  ZoomIn,
  X,
} from "lucide-react";

import {
  useAdminBarberDetail,
  useCreateBarberMutation,
  useUpdateBarberMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import {
  createBarberSchema,
  BARBER_PHOTO_ACCEPT,
  type CreateBarberFormValues,
  type UpdateBarberFormValues,
  updateBarberSchema,
  validateBarberPhotoFile,
} from "@/lib/schemas";
import { isApiError, type ApiError } from "@/api/client";
import { notify } from "@/lib/toast";
import {
  getBarberPhoto,
  getBarberPhotoOnError,
} from "@/lib/imageFallbacks";

/**
 * FAZ 8 / M1 — Berber create / edit (Bölüm 7.1).
 *
 * Mode:
 *  - /admin/barbers/new       → create (POST /api/barbers/create)
 *  - /admin/barbers/:id/edit  → update (PUT /api/barbers/{id}/update)
 *
 * 400 → form.setError (fieldErrors); 404 → "berber bulunamadı".
 */

export function BarberFormPage() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  return isEdit ? <EditBarberForm id={params.id!} /> : <CreateBarberForm />;
}

// ============================================================
// Create
// ============================================================

function CreateBarberForm() {
  const navigate = useNavigate();
  const mutation = useCreateBarberMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<CreateBarberFormValues>({
    resolver: zodResolver(createBarberSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      specialty: "",
      photo: null,
      bio: "",
    },
  });

  const onSubmit = (values: CreateBarberFormValues) => {
    setTopError(null);
    const body = buildBarberFormData(values);
    mutation.mutate(body, {
      onSuccess: (res) => {
        notify.success(res.message ?? "Berber oluşturuldu.");
        navigate(`/admin/barbers/${res.id}`, { replace: true });
      },
      onError: (err) => {
        if (!isApiError(err)) {
          setTopError("Beklenmeyen bir hata oluştu.");
          return;
        }
        bindFieldErrors(err, form, setTopError);
      },
    });
  };

  return (
    <FormShell
      title="Yeni Berber"
      subtitle="Berber bilgilerini gir."
      backHref="/admin/barbers"
    >
      <BarberFormFields
        form={form}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit}
        submitLabel="Berberi Oluştur"
      />
    </FormShell>
  );
}

// ============================================================
// Edit
// ============================================================

function EditBarberForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const detail = useAdminBarberDetail(id);
  const mutation = useUpdateBarberMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<UpdateBarberFormValues>({
    resolver: zodResolver(updateBarberSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      specialty: "",
      photo: null,
      bio: "",
      isActive: true,
    },
  });

  // Detail yüklendiğinde formu doldur
  useEffect(() => {
    if (!detail.data) return;
    form.reset({
      fullName: detail.data.fullName,
      specialty: detail.data.specialty ?? "",
      photo: null,
      bio: detail.data.bio ?? "",
      isActive: detail.data.isActive,
    });
  }, [detail.data, form]);

  const onSubmit = (values: UpdateBarberFormValues) => {
    setTopError(null);
    const body = buildBarberFormData(values, true);
    mutation.mutate(
      { id, body },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "Berber güncellendi.");
          navigate(`/admin/barbers/${id}`);
        },
        onError: (err) => {
          if (!isApiError(err)) {
            setTopError("Beklenmeyen bir hata oluştu.");
            return;
          }
          if (err.status === 404) {
            setTopError("Berber bulunamadı.");
            return;
          }
          bindFieldErrors(err, form, setTopError);
        },
      },
    );
  };

  if (detail.isLoading) {
    return (
      <FormShell
        title="Berber Düzenle"
        subtitle="Yükleniyor…"
        backHref={`/admin/barbers/${id}`}
      >
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </FormShell>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <FormShell
        title="Berber Düzenle"
        subtitle="Hata"
        backHref="/admin/barbers"
      >
        <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
          <div>
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
              Tekrar Dene
            </button>
          </div>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell
      title={`Düzenle: ${detail.data.fullName}`}
      subtitle="Berber bilgilerini güncelle."
      backHref={`/admin/barbers/${id}`}
    >
      <BarberFormFields
        form={form}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit}
        submitLabel="Değişiklikleri Kaydet"
        showIsActive
        currentPhotoUrl={detail.data.photoUrl}
      />
    </FormShell>
  );
}

// ============================================================
// Shared form
// ============================================================

interface BarberFormFieldsProps<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
> {
  form: ReturnType<typeof useForm<T>>;
  topError: string | null;
  submitting: boolean;
  onSubmit: (values: T) => void;
  submitLabel: string;
  showIsActive?: boolean;
  currentPhotoUrl?: string | null;
}

function BarberFormFields<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
>({
  form,
  topError,
  submitting,
  onSubmit,
  submitLabel,
  showIsActive = false,
  currentPhotoUrl = null,
}: BarberFormFieldsProps<T>) {
  // Generic'lik için cast (RHF tipleri zaten validated)
  const f = form as unknown as ReturnType<
    typeof useForm<UpdateBarberFormValues>
  >;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedPhoto = f.watch("photo");
  const photoError = f.formState.errors.photo?.message;
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<
    string | null
  >(null);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);

  useEffect(() => {
    if (!selectedPhoto || validateBarberPhotoFile(selectedPhoto)) {
      setSelectedPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setSelectedPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  const previewSource = selectedPhotoPreview ?? currentPhotoUrl ?? null;

  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource.url);
    };
  }, [cropSource]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    const error = validateBarberPhotoFile(file);
    if (error) {
      f.setError("photo", { type: "manual", message: error });
      return;
    }

    f.clearErrors("photo");
    openCropper(file);
  };

  const openCropper = (file: File) => {
    const url = URL.createObjectURL(file);
    setCropSource((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url };
    });
  };

  const handleCropApply = (file: File) => {
    const error = validateBarberPhotoFile(file);
    if (error) {
      f.setError("photo", { type: "manual", message: error });
      return;
    }

    f.setValue("photo", file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    f.clearErrors("photo");
    closeCropper();
  };

  const clearSelectedPhoto = () => {
    f.setValue("photo", null, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    f.clearErrors("photo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeCropper = () => {
    setCropSource((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  return (
    <form
      onSubmit={f.handleSubmit(onSubmit as never)}
      className="space-y-5"
      noValidate
    >
      {topError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-statusBusy/40 bg-statusBusy/5 px-4 py-3 text-sm text-statusBusy"
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{topError}</p>
        </div>
      )}

      <Field
        label="Ad Soyad"
        required
        error={f.formState.errors.fullName?.message}
      >
        <input
          type="text"
          autoComplete="name"
          maxLength={50}
          disabled={submitting}
          {...f.register("fullName")}
          className={inputClass}
        />
      </Field>

      <Field label="Uzmanlık" error={f.formState.errors.specialty?.message}>
        <input
          type="text"
          maxLength={200}
          disabled={submitting}
          placeholder="Sakal & Tıraş, Modern Kesim, …"
          {...f.register("specialty")}
          className={inputClass}
        />
      </Field>

      <Field
        label="Fotoğraf"
        error={photoError}
        hint="JPG, JPEG, PNG veya WebP. En fazla 5 MB."
      >
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/40 p-4">
          <div className="grid gap-4 md:grid-cols-[144px_1fr] md:items-center">
            <div className="space-y-2">
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-charcoal-100 shadow-sm">
                <img
                  key={previewSource ?? "photo-placeholder"}
                  src={getBarberPhoto(previewSource, "preview")}
                  alt="Fotoğrafın son görünümü"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback) return;
                    img.dataset.fallback = "1";
                    img.src = getBarberPhotoOnError("preview");
                  }}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-center text-xs text-charcoal-300">
                Son görünüm
              </p>
            </div>

            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-medium text-charcoal-700 transition-colors ${
                    submitting
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-oldGold-500 hover:text-oldGold-600"
                  }`}
                >
                  <ImagePlus className="w-4 h-4" />
                  Fotoğraf Seç
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={BARBER_PHOTO_ACCEPT}
                    disabled={submitting}
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>

                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={() => openCropper(selectedPhoto)}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-medium text-charcoal-700 transition-colors hover:border-oldGold-500 hover:text-oldGold-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Crop className="w-4 h-4" />
                    Kırpmayı Düzenle
                  </button>
                )}

                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={clearSelectedPhoto}
                    disabled={submitting}
                    aria-label="Seçilen fotoğrafı kaldır"
                    className="inline-flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-medium text-charcoal-500 transition-colors hover:border-statusBusy/40 hover:text-statusBusy disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="w-4 h-4" />
                    Seçimi Kaldır
                  </button>
                )}
              </div>

              <p className="text-sm text-charcoal-500">
                {selectedPhoto
                  ? "Yeni fotoğraf kırpıldı. Kaydedince bu görünüm kullanılacak."
                  : currentPhotoUrl
                    ? "Mevcut fotoğraf korunacak. Yeni fotoğraf seçersen önce kırpma ekranı açılır."
                    : "Fotoğraf seçersen önce kırpma ekranında kadrajı ayarlarsın."}
              </p>

              {selectedPhoto && (
                <p className="truncate text-xs text-charcoal-300">
                  Hazır dosya: {selectedPhoto.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </Field>

      <Field label="Biyografi" error={f.formState.errors.bio?.message}>
        <textarea
          rows={4}
          maxLength={500}
          disabled={submitting}
          placeholder="Kısa tanıtım…"
          {...f.register("bio")}
          className={`${inputClass} resize-none`}
        />
      </Field>

      {showIsActive && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/40 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-charcoal-900">Aktif</p>
            <p className="text-xs text-charcoal-300">
              Pasif berber müşteri tarafında görünmez.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              disabled={submitting}
              {...f.register("isActive")}
            />
            <span className="w-11 h-6 bg-charcoal-100 rounded-full peer peer-checked:bg-oldGold-500 transition-colors" />
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {submitLabel}
        </button>
      </div>

      {cropSource && (
        <PhotoCropModal
          source={cropSource}
          onCancel={closeCropper}
          onApply={handleCropApply}
        />
      )}
    </form>
  );
}

interface CropSource {
  file: File;
  url: string;
}

interface CropOffset {
  x: number;
  y: number;
}

const CROP_SIZE = 320;
const CROP_OUTPUT_SIZE = 1024;

function PhotoCropModal({
  source,
  onCancel,
  onApply,
}: {
  source: CropSource;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    offset: CropOffset;
  } | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const baseScale =
    imageSize.width > 0 && imageSize.height > 0
      ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height)
      : 1;
  const displayWidth = imageSize.width * baseScale * zoom;
  const displayHeight = imageSize.height * baseScale * zoom;

  const clampOffset = (next: CropOffset): CropOffset => {
    const maxX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (displayHeight - CROP_SIZE) / 2);
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  };

  useEffect(() => {
    setOffset((current) => clampOffset(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayWidth, displayHeight]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const next = {
      x: dragStart.offset.x + event.clientX - dragStart.x,
      y: dragStart.offset.y + event.clientY - dragStart.y,
    };
    setOffset(clampOffset(next));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  };

  const resetCrop = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setModalError(null);
  };

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || imageSize.width === 0 || imageSize.height === 0) return;

    setIsApplying(true);
    setModalError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas hazırlanamadı.");

      const outputScale = CROP_OUTPUT_SIZE / CROP_SIZE;
      const left = CROP_SIZE / 2 - displayWidth / 2 + offset.x;
      const top = CROP_SIZE / 2 - displayHeight / 2 + offset.y;
      const mimeType = getCanvasMimeType(source.file.type);

      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        left * outputScale,
        top * outputScale,
        displayWidth * outputScale,
        displayHeight * outputScale,
      );

      const blob = await canvasToBlob(canvas, mimeType);
      const croppedFile = new File([blob], getCroppedFileName(source.file), {
        type: mimeType,
        lastModified: Date.now(),
      });

      onApply(croppedFile);
    } catch {
      setModalError("Fotoğraf kırpılamadı. Lütfen başka bir fotoğraf deneyin.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotoğrafı kırp"
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/55 p-4"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-charcoal-900">
              Fotoğrafı Ayarla
            </h2>
            <p className="mt-1 text-sm text-charcoal-300">
              Sürükleyerek kadrajı ayarla, zoom ile yakınlaştır.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Kırpma ekranını kapat"
            className="rounded-lg border border-charcoal-100 p-2 text-charcoal-500 transition-colors hover:border-statusBusy/40 hover:text-statusBusy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[360px_1fr] md:items-center">
          <div className="flex justify-center">
            <div
              role="presentation"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative h-80 w-80 touch-none overflow-hidden rounded-full border-4 border-white bg-charcoal-900 shadow-inner ring-1 ring-charcoal-100 cursor-grab active:cursor-grabbing"
            >
              <img
                ref={imageRef}
                src={source.url}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  const img = event.currentTarget;
                  setImageSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-oldGold-500/80" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-charcoal-500">
                <ZoomIn className="w-4 h-4" />
                Yakınlaştır
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-oldGold-500"
              />
            </div>

            <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/50 p-4">
              <p className="text-sm font-medium text-charcoal-900">
                Kaydedilecek görünüm
              </p>
              <p className="mt-1 text-sm text-charcoal-300">
                Bu kadraj kare dosya olarak hazırlanır; uygulamada yuvarlak
                avatar içinde böyle görünür.
              </p>
            </div>

            {modalError && (
              <p className="rounded-lg border border-statusBusy/30 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy">
                {modalError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={resetCrop}
                className="inline-flex items-center gap-2 rounded-lg border border-charcoal-100 px-3 py-2 text-sm font-medium text-charcoal-500 transition-colors hover:border-oldGold-500 hover:text-oldGold-600"
              >
                <RotateCcw className="w-4 h-4" />
                Sıfırla
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-charcoal-100 px-4 py-2 text-sm font-medium text-charcoal-500 transition-colors hover:border-charcoal-300 hover:text-charcoal-900"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={applyCrop}
                disabled={isApplying || imageSize.width === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-oldGold-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oldGold-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crop className="w-4 h-4" />
                )}
                Uygula
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-200 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-500 mb-1.5">
        {label}
        {required && <span className="text-statusBusy ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-statusBusy text-xs mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-charcoal-300 text-xs mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

interface FormShellProps {
  title: string;
  subtitle: string;
  backHref: string;
  children: ReactNode;
}

function FormShell({ title, subtitle, backHref, children }: FormShellProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-oldGold-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Geri
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8"
      >
        <header className="mb-6">
          <h1 className="font-display text-2xl text-charcoal-900">{title}</h1>
          <p className="text-sm text-charcoal-300 mt-1">{subtitle}</p>
        </header>
        {children}
      </motion.div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function buildBarberFormData(
  values: CreateBarberFormValues | UpdateBarberFormValues,
  isUpdate = false,
): FormData {
  const formData = new FormData();
  formData.append("FullName", values.fullName.trim());
  appendTrimmed(formData, "Specialty", values.specialty);
  appendTrimmed(formData, "Bio", values.bio);

  if (isUpdate && "isActive" in values) {
    formData.append("IsActive", String(values.isActive));
  }

  if (values.photo) {
    formData.append("Photo", values.photo);
  }

  return formData;
}

function appendTrimmed(
  formData: FormData,
  key: string,
  value: string | undefined,
) {
  const trimmed = value?.trim();
  if (trimmed) formData.append(key, trimmed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getCanvasMimeType(fileType: string): "image/jpeg" | "image/png" | "image/webp" {
  if (fileType === "image/png") return "image/png";
  if (fileType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function getCroppedFileName(file: File): string {
  const mimeType = getCanvasMimeType(file.type);
  const extension =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "barber-photo";
  return `${baseName}-cropped.${extension}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Canvas blob üretilemedi."));
      },
      mimeType,
      0.92,
    );
  });
}

function bindFieldErrors<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
>(
  err: ApiError,
  form: ReturnType<typeof useForm<T>>,
  setTopError: (msg: string | null) => void,
) {
  if (err.status === 400 && err.fieldErrors) {
    let bound = false;
    for (const [key, messages] of Object.entries(err.fieldErrors)) {
      const f = mapField(key);
      if (f && messages[0]) {
        (form as unknown as ReturnType<typeof useForm>).setError(f, {
          message: messages[0],
        });
        bound = true;
      }
    }
    if (!bound) setTopError(err.message);
    return;
  }
  setTopError(err.message);
}

function mapField(
  key: string,
):
  | "fullName"
  | "specialty"
  | "photo"
  | "bio"
  | "isActive"
  | null {
  const k = key.toLowerCase();
  if (k === "fullname") return "fullName";
  if (k === "specialty") return "specialty";
  if (k === "photo" || k === "photourl") return "photo";
  if (k === "bio") return "bio";
  if (k === "isactive") return "isActive";
  return null;
}
