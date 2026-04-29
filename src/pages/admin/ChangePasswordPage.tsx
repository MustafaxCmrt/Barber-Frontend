import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useChangePasswordMutation } from "@/features/admin/queries";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/schemas";
import { isApiError, type ApiError } from "@/api/client";
import { notify } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";

/**
 * Bölüm 3.6 — şifre değiştirme.
 *
 * 401 → "Mevcut şifre hatalı" (interceptor'da change-password endpoint'i
 * auto-logout'tan muaf — domain auth hatası).
 *
 * Başarı sonrası → security best practice: oturumu kapatıp tekrar login iste.
 */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const mutation = useChangePasswordMutation();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleApiError = (error: ApiError) => {
    if (error.status === 401) {
      form.setError("currentPassword", { message: "Mevcut şifre hatalı" });
      setTopError("Mevcut şifre hatalı.");
      return;
    }
    if (error.status === 400 && error.fieldErrors) {
      let bound = false;
      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const f = mapField(key);
        if (f && messages[0]) {
          form.setError(f, { message: messages[0] });
          bound = true;
        }
      }
      if (!bound) setTopError(error.message);
      return;
    }
    setTopError(error.message);
  };

  const onSubmit = (data: ChangePasswordFormValues) => {
    setTopError(null);
    mutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          notify.success("Şifreniz güncellendi. Lütfen tekrar giriş yapın.");
          logout();
          navigate("/admin/login", { replace: true });
        },
        onError: (error) => {
          if (isApiError(error)) {
            handleApiError(error);
          } else {
            setTopError("Beklenmeyen bir hata oluştu.");
          }
        },
      },
    );
  };

  const submitting = mutation.isPending;

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-charcoal-100 shadow-card p-6 md:p-8 space-y-6"
      >
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-charcoal-900">
              Şifre Değiştir
            </h1>
            <p className="text-sm text-charcoal-300 mt-0.5">
              Şifre değişikliğinden sonra tekrar giriş yapmanız istenecektir.
            </p>
          </div>
        </header>

        {topError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-statusBusy/30 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{topError}</p>
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <PasswordField
            id="currentPassword"
            label="Mevcut Şifre"
            autoComplete="current-password"
            visible={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            disabled={submitting}
            register={form.register("currentPassword")}
            error={form.formState.errors.currentPassword?.message}
          />

          <PasswordField
            id="newPassword"
            label="Yeni Şifre"
            autoComplete="new-password"
            visible={showNew}
            onToggle={() => setShowNew((s) => !s)}
            disabled={submitting}
            register={form.register("newPassword")}
            error={form.formState.errors.newPassword?.message}
            hint="En az 8 karakter."
          />

          <PasswordField
            id="confirmPassword"
            label="Yeni Şifre (Tekrar)"
            autoComplete="new-password"
            visible={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            disabled={submitting}
            register={form.register("confirmPassword")}
            error={form.formState.errors.confirmPassword?.message}
          />

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                         bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium
                         transition-colors duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Şifreyi Güncelle"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
  disabled: boolean;
  register: ReturnType<
    ReturnType<typeof useForm<ChangePasswordFormValues>>["register"]
  >;
  error?: string;
  hint?: string;
}

function PasswordField({
  id,
  label,
  autoComplete,
  visible,
  onToggle,
  disabled,
  register,
  error,
  hint,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-charcoal-500 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          {...register}
          className="w-full pr-10 px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                     focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                     disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-charcoal-300 hover:text-oldGold-600 disabled:opacity-50"
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error ? (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-charcoal-300 text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function mapField(
  key: string,
):
  | "currentPassword"
  | "newPassword"
  | "confirmPassword"
  | null {
  const k = key.toLowerCase();
  if (k === "currentpassword") return "currentPassword";
  if (k === "newpassword") return "newPassword";
  return null;
}
