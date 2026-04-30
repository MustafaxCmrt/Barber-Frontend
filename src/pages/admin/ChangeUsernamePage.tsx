import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldAlert, User2 } from "lucide-react";
import { useChangeUsernameMutation } from "@/features/admin/queries";
import {
  changeUsernameSchema,
  type ChangeUsernameFormValues,
} from "@/lib/schemas";
import { isApiError, type ApiError } from "@/api/client";
import { notify } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";

/**
 * PUT /api/auth/change-username — Authorize(Roles="Admin").
 * Başarı: backend yeni accessToken döner; updateToken ile sessionStorage
 * güncellenmeli (aksi halde sonraki istekler eski username içeren token ile gider).
 *
 * Hata akışı:
 *  - 401 → currentPassword field'ına bind ("Mevcut şifre hatalı.")
 *  - 409 → newUsername field'ına bind ("Bu kullanıcı adı zaten kullanılıyor.")
 *  - 400 → fieldErrors form'a bind
 */
export function ChangeUsernamePage() {
  const updateToken = useAuthStore((s) => s.updateToken);
  const currentUsername = useAuthStore((s) => s.username);
  const mutation = useChangeUsernameMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<ChangeUsernameFormValues>({
    resolver: zodResolver(changeUsernameSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newUsername: "",
    },
  });

  const handleApiError = (error: ApiError) => {
    if (error.status === 401) {
      form.setError("currentPassword", { message: "Mevcut şifre hatalı" });
      setTopError("Mevcut şifre hatalı.");
      return;
    }
    if (error.status === 409) {
      form.setError("newUsername", {
        message: "Bu kullanıcı adı zaten kullanılıyor.",
      });
      setTopError("Bu kullanıcı adı zaten kullanılıyor.");
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

  const onSubmit = (data: ChangeUsernameFormValues) => {
    setTopError(null);
    mutation.mutate(
      {
        currentPassword: data.currentPassword,
        newUsername: data.newUsername.trim(),
      },
      {
        onSuccess: (response) => {
          updateToken(response);
          form.reset({ currentPassword: "", newUsername: "" });
          notify.success(
            `Kullanıcı adı güncellendi: ${response.username}`,
          );
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
            <User2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-charcoal-900">
              Kullanıcı Adı Değiştir
            </h1>
            <p className="text-sm text-charcoal-300 mt-0.5">
              Mevcut kullanıcı adın:{" "}
              <span className="text-charcoal-700 font-medium">
                {currentUsername ?? "—"}
              </span>
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
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-charcoal-500 mb-1.5"
            >
              Mevcut Şifre
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={submitting}
                {...form.register("currentPassword")}
                className="w-full pr-10 px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                           focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                           disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                disabled={submitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-charcoal-300 hover:text-oldGold-600 disabled:opacity-50"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-red-600 text-xs mt-1">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="newUsername"
              className="block text-sm font-medium text-charcoal-500 mb-1.5"
            >
              Yeni Kullanıcı Adı
            </label>
            <input
              id="newUsername"
              type="text"
              autoComplete="username"
              maxLength={30}
              disabled={submitting}
              {...form.register("newUsername")}
              placeholder="yeniKullaniciAdi"
              className="w-full px-4 py-2.5 rounded-lg border border-charcoal-100 bg-white text-charcoal-900
                         focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                         disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            />
            {form.formState.errors.newUsername ? (
              <p className="text-red-600 text-xs mt-1">
                {form.formState.errors.newUsername.message}
              </p>
            ) : (
              <p className="text-charcoal-300 text-xs mt-1">
                En fazla 30 karakter.
              </p>
            )}
          </div>

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
                "Kullanıcı Adını Güncelle"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function mapField(
  key: string,
): "currentPassword" | "newUsername" | null {
  const k = key.toLowerCase();
  if (k === "currentpassword") return "currentPassword";
  if (k === "newusername") return "newUsername";
  return null;
}
