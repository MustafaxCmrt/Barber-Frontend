import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useForm,
  type FieldErrors as RHFFieldErrors,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Loader2,
  Phone,
  Scissors,
  Users,
} from "lucide-react";

import { ServiceCard } from "@/components/ServiceCard";
import {
  BarberCardSkeleton,
  ServiceCardSkeleton,
  Skeleton,
} from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StepIndicator, type StepDef } from "@/components/StepIndicator";
import { SlotGrid } from "@/components/SlotGrid";
import { BarberPickCard } from "@/components/BarberPickCard";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import {
  publicKeys,
  useBarbersByService,
  useCreateAppointmentMutation,
  usePublicBarberDetail,
  usePublicServices,
} from "@/features/public/queries";
import {
  addDays,
  formatDuration,
  formatLongLocalDateTime,
  formatMoney,
  toDateOnly,
  toLocalISO,
} from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError, type ApiError } from "@/api/client";
import {
  createAppointmentSchema,
  type CreateAppointmentFormValues,
} from "@/lib/schemas";
import type {
  CreateAppointmentDto,
  PublicBarberDetailDto,
  PublicBarberDto,
  PublicServiceDto,
} from "@/api/types";
import { ErrorCode } from "@/api/errorCodes";
import { getBarberPhoto, getBarberPhotoOnError } from "@/lib/imageFallbacks";

/**
 * FAZ 3 — Randevu Alma Akışı (Bölüm 8.1).
 *
 * 5 adımlı wizard:
 *  1) Hizmet (multi-select)
 *  2) Berber (ilk hizmete göre kesişim)
 *  3) Tarih + Slot (SlotGrid)
 *  4) Müşteri bilgileri (RHF + zodResolver)
 *  5) Özet + onay (POST /api/public/appointments)
 *
 * Hata akışı (Bölüm 4.2 + 8.7):
 *  - 400 → fieldErrors form'a bind + Step 4
 *  - 409 → toast + slots invalidate + selectedSlot reset + Step 3
 *  - 422 SHOP_CLOSED / OUTSIDE_WORKING_HOURS → Step 3
 *  - 422 SERVICE_NOT_OFFERED / BARBER_INACTIVE → Step 2
 *  - 429 → interceptor zaten toast atıyor
 */

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: StepDef[] = [
  { id: 1, label: "Hizmet" },
  { id: 2, label: "Berber" },
  { id: 3, label: "Tarih & Saat" },
  { id: 4, label: "Bilgileriniz" },
  { id: 5, label: "Onay" },
];

/**
 * Reload sonrası kullanıcının kaldığı adımda devam edebilmesi için:
 *  - Adım numarası: URL query param (`?step=...`). Tek kaynak hakikat.
 *  - Form & seçim verisi: sessionStorage (sekme kapanınca silinir, PII güvenliği
 *    makul; localStorage cross-tab leak riskli).
 */
const STEP_TO_SLUG: Record<Step, string> = {
  1: "hizmet",
  2: "berber",
  3: "tarih",
  4: "bilgiler",
  5: "ozet",
};

const SLUG_TO_STEP: Record<string, Step> = {
  hizmet: 1,
  berber: 2,
  tarih: 3,
  bilgiler: 4,
  ozet: 5,
};

const DRAFT_STORAGE_KEY = "barbeyond.bookingDraft";

interface BookingDraft {
  selectedServiceIds?: string[];
  selectedBarberId?: string;
  selectedDate?: string;
  selectedSlot?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

function loadDraft(): BookingDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : {};
  } catch {
    return {};
  }
}

function saveDraft(patch: BookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDraft();
    window.sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // quota / private mode — sessizce yut.
  }
}

function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function AppointmentBookingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialBarberId = searchParams.get("barberId") ?? "";
  const initialServiceId = searchParams.get("serviceId") ?? "";

  const today = useMemo(() => toDateOnly(new Date()), []);
  const maxDate = useMemo(() => toDateOnly(addDays(60)), []);

  // SessionStorage'daki draft — mount anında bir kez okunur, sonraki
  // okumalar değişen state'ten yapılır.
  const draftRef = useRef<BookingDraft>(loadDraft());
  const draft = draftRef.current;

  // ----- Step: URL query param tek kaynak hakikat -----
  const step: Step = SLUG_TO_STEP[searchParams.get("step") ?? ""] ?? 1;

  const navigateToStep = useCallback(
    (target: Step, options: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("step", STEP_TO_SLUG[target]);
          return next;
        },
        { replace: options.replace ?? false },
      );
    },
    [setSearchParams],
  );

  // ----- Wizard state: URL query param > draft > boş -----
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (initialServiceId) return [initialServiceId];
    if (draft.selectedServiceIds && draft.selectedServiceIds.length > 0) {
      return draft.selectedServiceIds;
    }
    return [];
  });
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    () => initialBarberId || draft.selectedBarberId || "",
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    () => draft.selectedDate || today,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    () => draft.selectedSlot ?? null,
  );

  const servicesQuery = usePublicServices({ Page: 1, PageSize: 50 });
  const barbersQuery = useBarbersByService(selectedServiceIds[0], {
    Page: 1,
    PageSize: 50,
  });
  const barberDetailQuery = usePublicBarberDetail(
    selectedBarberId || undefined,
  );
  const mutation = useCreateAppointmentMutation();

  const form = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    mode: "onBlur",
    defaultValues: {
      barberId: initialBarberId || draft.selectedBarberId || "",
      serviceIds: initialServiceId
        ? [initialServiceId]
        : (draft.selectedServiceIds ?? []),
      startTime: "",
      customerName: draft.customerName ?? "",
      customerPhone: draft.customerPhone ?? "",
      notes: draft.notes ?? "",
    },
  });

  // ----- URL'de step yoksa default'a düşür (replace, history kirletme) -----
  useEffect(() => {
    if (!searchParams.get("step")) {
      navigateToStep(1, { replace: true });
    }
    // Sadece mount'ta — sonraki render'lar URL'i zaten yönetiyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Draft persist: wizard state değişince -----
  useEffect(() => {
    saveDraft({
      selectedServiceIds,
      selectedBarberId,
      selectedDate,
      selectedSlot,
    });
  }, [selectedServiceIds, selectedBarberId, selectedDate, selectedSlot]);

  // ----- Draft persist: form alanları değişince -----
  useEffect(() => {
    const subscription = form.watch((values) => {
      saveDraft({
        customerName: values.customerName ?? "",
        customerPhone: values.customerPhone ?? "",
        notes: values.notes ?? "",
      });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // ----- Adım atlama guard: önceki adımların datası eksikse uygun adıma at -----
  useEffect(() => {
    if (step >= 2 && selectedServiceIds.length === 0) {
      navigateToStep(1, { replace: true });
      return;
    }
    if (step >= 3 && !selectedBarberId) {
      navigateToStep(2, { replace: true });
      return;
    }
    if (step >= 4 && (!selectedDate || !selectedSlot)) {
      navigateToStep(3, { replace: true });
      return;
    }
    if (step === 5) {
      const name = form.getValues("customerName");
      const phone = form.getValues("customerPhone");
      if (!name || !phone) {
        navigateToStep(4, { replace: true });
      }
    }
  }, [
    step,
    selectedServiceIds,
    selectedBarberId,
    selectedDate,
    selectedSlot,
    form,
    navigateToStep,
  ]);

  // ----- Hidden field sync: wizard state → form -----
  useEffect(() => {
    form.setValue("barberId", selectedBarberId, { shouldValidate: false });
  }, [selectedBarberId, form]);

  useEffect(() => {
    form.setValue("serviceIds", selectedServiceIds, { shouldValidate: false });
  }, [selectedServiceIds, form]);

  useEffect(() => {
    if (selectedDate && selectedSlot) {
      form.setValue(
        "startTime",
        toLocalISO(`${selectedDate}T${selectedSlot}:00`),
        { shouldValidate: false },
      );
    } else {
      form.setValue("startTime", "", { shouldValidate: false });
    }
  }, [selectedDate, selectedSlot, form]);

  // ----- Derived: seçilen hizmetler -----
  const selectedServices = useMemo(() => {
    if (!servicesQuery.data) return [];
    return servicesQuery.data.items.filter((s) =>
      selectedServiceIds.includes(s.id),
    );
  }, [servicesQuery.data, selectedServiceIds]);

  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const selectedBarber: PublicBarberDetailDto | null =
    barberDetailQuery.data ?? null;

  // ----- Step navigation -----
  const goPrev = () => {
    if (step > 1) navigateToStep((step - 1) as Step);
  };

  const goNext = async () => {
    if (step === 1) {
      if (selectedServiceIds.length === 0) {
        notify.error("En az bir hizmet seçin");
        return;
      }
    } else if (step === 2) {
      if (!selectedBarberId) {
        notify.error("Bir berber seçin");
        return;
      }
    } else if (step === 3) {
      if (!selectedDate || !selectedSlot) {
        notify.error("Tarih ve saat seçin");
        return;
      }
    } else if (step === 4) {
      const ok = await form.trigger([
        "customerName",
        "customerPhone",
        "notes",
      ]);
      if (!ok) return;
    }
    if (step < 5) navigateToStep((step + 1) as Step);
  };

  // ----- Toggle service (multi-select) -----
  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      return next;
    });
    // Hizmet değişirse berber/slot eşleşmesi kaybolabilir → slot'u resetle
    setSelectedSlot(null);
  };

  // ----- Date change resets slot -----
  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedSlot(null);
  };

  // ----- Submit error handling -----
  const handleApiError = (error: ApiError) => {
    // 400 — field errors
    if (error.status === 400 && error.fieldErrors) {
      let bound = false;
      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const field = mapBackendField(key);
        if (field && messages[0]) {
          form.setError(field, { message: messages[0] });
          bound = true;
        }
      }
      if (bound) {
        navigateToStep(4, { replace: true });
        return;
      }
      notify.error(error.message);
      return;
    }

    // 409 — slot conflict (Pre-prod 1.7: APPOINTMENT_SLOT_TAKEN code'u eklendi)
    if (error.status === 409) {
      const msg =
        error.code === ErrorCode.APPOINTMENT_SLOT_TAKEN
          ? "Bu slot az önce başkası tarafından alındı. Başka bir saat seçin."
          : "Bu slot az önce başkası tarafından alındı";
      notify.error(msg);
      queryClient.invalidateQueries({
        queryKey: publicKeys.availableSlots({
          barberId: selectedBarberId,
          date: selectedDate,
          serviceIds: selectedServiceIds,
        }),
      });
      setSelectedSlot(null);
      navigateToStep(3, { replace: true });
      return;
    }

    // 422 — code-specific (Bölüm 4.2)
    if (error.status === 422) {
      const code = error.code;
      const msg = customMessageFor422(code, error.message);
      notify.error(msg);

      if (
        code === ErrorCode.SHOP_CLOSED ||
        code === ErrorCode.OUTSIDE_WORKING_HOURS
      ) {
        queryClient.invalidateQueries({
          queryKey: publicKeys.availableSlots({
            barberId: selectedBarberId,
            date: selectedDate,
            serviceIds: selectedServiceIds,
          }),
        });
        setSelectedSlot(null);
        navigateToStep(3, { replace: true });
      } else if (
        code === ErrorCode.SERVICE_NOT_OFFERED ||
        code === ErrorCode.BARBER_INACTIVE
      ) {
        navigateToStep(2, { replace: true });
      }
      return;
    }

    // 429 — interceptor zaten toast atıyor
    if (error.status === 429) return;

    notify.error(error.message);
  };

  const onSubmit = (data: CreateAppointmentFormValues) => {
    const body: CreateAppointmentDto = {
      barberId: data.barberId,
      serviceIds: data.serviceIds,
      startTime: data.startTime,
      customerFullName: data.customerName,
      customerPhone: data.customerPhone,
      notes:
        data.notes && data.notes.trim() !== ""
          ? data.notes.trim()
          : undefined,
    };

    mutation.mutate(body, {
      onSuccess: (response) => {
        clearDraft();
        // Pre-prod 1.1: cancellationCode bir kez döner — URL'e koymuyoruz
        // (paylaşım/bookmark riski). React Router state ile aktarıyoruz; refresh
        // dayanıklılığı için sessionStorage'a da yazıyoruz, success page okuyup siler.
        try {
          window.sessionStorage.setItem(
            `barbeyond.cancellationCode.${response.id}`,
            response.cancellationCode,
          );
        } catch {
          // quota / private mode — sessizce yut, navigate state hâlâ taşır.
        }
        navigate(`/randevu-basarili?id=${response.id}`, {
          replace: true,
          state: { cancellationCode: response.cancellationCode },
        });
      },
      onError: (error) => {
        if (isApiError(error)) {
          handleApiError(error);
        } else {
          notify.error("Beklenmeyen bir hata oluştu.");
        }
      },
    });
  };

  const onValidationError = (
    errors: RHFFieldErrors<CreateAppointmentFormValues>,
  ) => {
    if (errors.serviceIds) {
      notify.error("Hizmet seçimi eksik");
      navigateToStep(1, { replace: true });
      return;
    }
    if (errors.barberId) {
      notify.error("Berber seçimi eksik");
      navigateToStep(2, { replace: true });
      return;
    }
    if (errors.startTime) {
      notify.error("Geçerli bir tarih ve saat seçin");
      navigateToStep(3, { replace: true });
      return;
    }
    if (errors.customerName || errors.customerPhone || errors.notes) {
      navigateToStep(4, { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-600 mb-3">
          Randevu Al
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal-900">
          Birkaç adımda sandalyenizdesiniz.
        </h1>
      </div>

      <div className="mb-10">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {step === 1 && (
          <ServicesStep
            isLoading={servicesQuery.isLoading}
            isError={servicesQuery.isError}
            services={servicesQuery.data?.items ?? []}
            selectedIds={selectedServiceIds}
            onToggle={toggleService}
            onRetry={() => servicesQuery.refetch()}
          />
        )}

        {step === 2 && (
          <BarbersStep
            isLoading={barbersQuery.isLoading}
            isError={barbersQuery.isError}
            barbers={barbersQuery.data?.items ?? []}
            selectedId={selectedBarberId}
            onSelect={(id) => {
              setSelectedBarberId(id);
              setSelectedSlot(null);
            }}
            onRetry={() => barbersQuery.refetch()}
            firstServiceName={
              servicesQuery.data?.items.find(
                (s) => s.id === selectedServiceIds[0],
              )?.name ?? ""
            }
          />
        )}

        {step === 3 && (
          <DateSlotStep
            barberId={selectedBarberId}
            serviceIds={selectedServiceIds}
            date={selectedDate}
            minDate={today}
            maxDate={maxDate}
            onDateChange={handleDateChange}
            selectedSlot={selectedSlot}
            onSlotSelect={setSelectedSlot}
            totalDuration={totalDuration}
          />
        )}

        {step === 4 && <CustomerInfoStep form={form} />}

        {step === 5 && (
          <SummaryStep
            services={selectedServices}
            barber={selectedBarber}
            date={selectedDate}
            slot={selectedSlot}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            customerName={form.getValues("customerName")}
            customerPhone={form.getValues("customerPhone")}
            notes={form.getValues("notes")}
          />
        )}
      </motion.div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1 || mutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium transition-colors"
          >
            İleri
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={form.handleSubmit(onSubmit, onValidationError)}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Randevuyu Onayla
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Step 1 — Hizmet seçimi
// ============================================================

interface ServicesStepProps {
  isLoading: boolean;
  isError: boolean;
  services: PublicServiceDto[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRetry: () => void;
}

function ServicesStep({
  isLoading,
  isError,
  services,
  selectedIds,
  onToggle,
  onRetry,
}: ServicesStepProps) {
  return (
    <section className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-charcoal-900">
            Hangi hizmeti istersiniz?
          </h2>
          <p className="text-sm text-charcoal-300 mt-0.5">
            Birden fazla seçim yapabilirsiniz.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon="error"
          title="Hizmetler yüklenemedi"
          description="Backend'e bağlanılamadı."
          action={
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
            >
              Tekrar Dene
            </button>
          }
        />
      ) : services.length === 0 ? (
        <EmptyState
          title="Hizmet yok"
          description="Henüz aktif bir hizmet tanımlı değil."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.id}
              service={service}
              delayIndex={i}
              selected={selectedIds.includes(service.id)}
              onClick={() => onToggle(service.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Step 2 — Berber seçimi
// ============================================================

interface BarbersStepProps {
  isLoading: boolean;
  isError: boolean;
  barbers: PublicBarberDto[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRetry: () => void;
  firstServiceName: string;
}

function BarbersStep({
  isLoading,
  isError,
  barbers,
  selectedId,
  onSelect,
  onRetry,
  firstServiceName,
}: BarbersStepProps) {
  return (
    <section className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-charcoal-900">
            Berberinizi seçin
          </h2>
          <p className="text-sm text-charcoal-300 mt-0.5">
            {firstServiceName
              ? `"${firstServiceName}" hizmetini sunan berberler.`
              : "Seçtiğiniz hizmeti sunan berberler."}
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <BarberCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon="error"
          title="Berberler yüklenemedi"
          description="Backend'e bağlanılamadı."
          action={
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
            >
              Tekrar Dene
            </button>
          }
        />
      ) : barbers.length === 0 ? (
        <EmptyState
          title="Bu hizmeti sunan berber yok"
          description="Lütfen önceki adıma dönüp hizmet seçiminizi değiştirin."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {barbers.map((barber, i) => (
            <BarberPickCard
              key={barber.id}
              barber={barber}
              selected={selectedId === barber.id}
              onClick={() => onSelect(barber.id)}
              delayIndex={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Step 3 — Tarih + Slot
// ============================================================

interface DateSlotStepProps {
  barberId: string;
  serviceIds: string[];
  date: string;
  minDate: string;
  maxDate: string;
  onDateChange: (value: string) => void;
  selectedSlot: string | null;
  onSlotSelect: (slot: string) => void;
  totalDuration: number;
}

function DateSlotStep({
  barberId,
  serviceIds,
  date,
  minDate,
  maxDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  totalDuration,
}: DateSlotStepProps) {
  return (
    <section className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-charcoal-900">
            Tarih ve saat
          </h2>
          <p className="text-sm text-charcoal-300 mt-0.5">
            Toplam süre:{" "}
            <span className="text-charcoal-900 font-medium">
              {formatDuration(totalDuration)}
            </span>
          </p>
        </div>
      </header>

      <div className="space-y-2">
        <h3 className="font-display text-lg text-charcoal-900">Tarih seçin</h3>
        <p className="text-xs text-charcoal-300">
          Müsait günler beyaz; kapalı veya tüm randevuları dolu günler gridir.
          Bugünden itibaren 60 gün ileriye kadar.
        </p>
        <AvailabilityCalendar
          barberId={barberId}
          serviceIds={serviceIds}
          selectedDate={date}
          onSelectDate={onDateChange}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg text-charcoal-900">
          Müsait saatler
        </h3>
        <SlotLegend />
        <SlotGrid
          barberId={barberId}
          date={date}
          serviceIds={serviceIds}
          selectedSlot={selectedSlot}
          onSelect={onSlotSelect}
        />
      </div>

      {selectedSlot && (
        <div className="rounded-xl bg-oldGold-50 border border-oldGold-200 p-4 text-sm text-charcoal-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-oldGold-600" />
          <span>
            Seçilen: <strong>{selectedSlot}</strong> — {date}
          </span>
        </div>
      )}
    </section>
  );
}

function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500">
      <LegendDot className="bg-green-600" label="Müsait" />
      <LegendDot className="bg-red-600" label="Dolu" />
      <LegendDot className="bg-neutral-300" label="Kapalı" />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// ============================================================
// Step 4 — Müşteri bilgileri
// ============================================================

interface CustomerInfoStepProps {
  form: UseFormReturn<CreateAppointmentFormValues>;
}

function CustomerInfoStep({ form }: CustomerInfoStepProps) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;
  const notesValue = watch("notes") ?? "";

  return (
    <section className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
          <Phone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-charcoal-900">
            Bilgileriniz
          </h2>
          <p className="text-sm text-charcoal-300 mt-0.5">
            İletişim bilgileriniz randevu doğrulaması ve iptal için kullanılır.
          </p>
        </div>
      </header>

      <div className="space-y-5 max-w-xl">
        <div>
          <label
            htmlFor="customerName"
            className="block text-sm font-medium text-charcoal-500 mb-1.5"
          >
            Ad Soyad
          </label>
          <input
            id="customerName"
            type="text"
            autoComplete="name"
            {...register("customerName")}
            placeholder="Mehmet Demir"
            className="w-full px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors"
          />
          {errors.customerName && (
            <p className="text-red-600 text-xs mt-1">
              {errors.customerName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="customerPhone"
            className="block text-sm font-medium text-charcoal-500 mb-1.5"
          >
            Telefon
          </label>
          <input
            id="customerPhone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            maxLength={11}
            {...register("customerPhone")}
            placeholder="05XXXXXXXXX"
            className="w-full px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors"
          />
          {errors.customerPhone && (
            <p className="text-red-600 text-xs mt-1">
              {errors.customerPhone.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-charcoal-500 mb-1.5"
          >
            Notlar{" "}
            <span className="text-charcoal-300 font-normal">(opsiyonel)</span>
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={500}
            {...register("notes")}
            placeholder="Özel istekleriniz veya hatırlatmak istedikleriniz."
            className="w-full px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-1 gap-4">
            <p className="text-red-600 text-xs flex-1">
              {errors.notes?.message ?? ""}
            </p>
            <span className="text-xs text-charcoal-300 shrink-0">
              {notesValue.length}/500
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Step 5 — Özet
// ============================================================

interface SummaryStepProps {
  services: PublicServiceDto[];
  barber: PublicBarberDetailDto | null;
  date: string;
  slot: string | null;
  totalDuration: number;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  notes: string | undefined;
}

function SummaryStep({
  services,
  barber,
  date,
  slot,
  totalDuration,
  totalPrice,
  customerName,
  customerPhone,
  notes,
}: SummaryStepProps) {
  const startTime = slot ? `${date}T${slot}:00` : null;

  return (
    <section className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8 space-y-6">
      <header>
        <h2 className="font-display text-2xl text-charcoal-900">
          Randevu özeti
        </h2>
        <p className="text-sm text-charcoal-300 mt-0.5">
          Bilgileri kontrol edin ve onaylayın.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SummaryBlock label="Hizmetler">
            <ul className="space-y-2">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-charcoal-900">{s.name}</span>
                  <span className="text-charcoal-300">
                    {formatDuration(s.durationMinutes)} ·{" "}
                    {formatMoney(s.price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-charcoal-100 flex items-center justify-between text-sm">
              <span className="text-charcoal-300">Toplam</span>
              <span className="font-display text-lg text-charcoal-900">
                {formatDuration(totalDuration)} · {formatMoney(totalPrice)}
              </span>
            </div>
          </SummaryBlock>

          <SummaryBlock label="Tarih & Saat">
            {startTime ? (
              <p className="text-charcoal-900">
                {formatLongLocalDateTime(startTime)}
              </p>
            ) : (
              <p className="text-charcoal-300">Saat seçilmedi.</p>
            )}
          </SummaryBlock>
        </div>

        <div className="space-y-4">
          <SummaryBlock label="Berber">
            {barber ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-charcoal-100 shrink-0">
                  <img
                    src={getBarberPhoto(barber.photoUrl, barber.id)}
                    alt={barber.fullName}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackTried !== "1") {
                        img.dataset.fallbackTried = "1";
                        img.src = getBarberPhotoOnError(barber.id);
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-display text-lg text-charcoal-900">
                    {barber.fullName}
                  </p>
                  {barber.specialty && (
                    <p className="text-xs text-charcoal-300">
                      {barber.specialty}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Skeleton className="h-14 w-full" />
            )}
          </SummaryBlock>

          <SummaryBlock label="Bilgileriniz">
            <dl className="text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-charcoal-300 shrink-0">Ad:</dt>
                <dd className="text-charcoal-900 break-words">
                  {customerName || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-charcoal-300 shrink-0">Tel:</dt>
                <dd className="text-charcoal-900">{customerPhone || "—"}</dd>
              </div>
              {notes && notes.trim() !== "" && (
                <div className="flex gap-2">
                  <dt className="text-charcoal-300 shrink-0">Not:</dt>
                  <dd className="text-charcoal-900 break-words">{notes}</dd>
                </div>
              )}
            </dl>
          </SummaryBlock>
        </div>
      </div>
    </section>
  );
}

function SummaryBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/40 p-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-charcoal-300 mb-2">
        {label}
      </h3>
      {children}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

type FormFieldName =
  | "barberId"
  | "serviceIds"
  | "startTime"
  | "customerName"
  | "customerPhone"
  | "notes";

function mapBackendField(key: string): FormFieldName | null {
  const lower = key.toLowerCase();
  if (lower === "barberid") return "barberId";
  if (lower === "serviceids") return "serviceIds";
  if (lower === "starttime") return "startTime";
  if (lower === "customerfullname" || lower === "customername")
    return "customerName";
  if (lower === "customerphone") return "customerPhone";
  if (lower === "notes") return "notes";
  return null;
}

function customMessageFor422(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case ErrorCode.SHOP_CLOSED:
      return "Salon o gün kapalı, başka tarih seçin";
    case ErrorCode.OUTSIDE_WORKING_HOURS:
      return "Saat çalışma aralığı dışında";
    case ErrorCode.SERVICE_NOT_OFFERED:
      return "Bu berber bu hizmeti sunmuyor";
    case ErrorCode.SPAM_GUARD_TRIGGERED:
      return "Çok fazla deneme, biraz bekleyin";
    case ErrorCode.BARBER_INACTIVE:
      return "Bu berber şu an müsait değil, başka berber seçin";
    case ErrorCode.INVALID_SERVICES:
      return "Hizmet seçimi geçersiz";
    default:
      return fallback;
  }
}
