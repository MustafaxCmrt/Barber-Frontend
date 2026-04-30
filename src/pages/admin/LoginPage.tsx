import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, ShieldAlert, User } from "lucide-react";
import { isTokenExpired, useAuthStore } from "@/stores/authStore";
import { useLoginMutation } from "@/features/admin/queries";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { isApiError, type ApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";
import { notify } from "@/lib/toast";
import { BarbeyondLogo } from "@/components/BarbeyondLogo";

const LOCKOUT_DEFAULT_SECONDS = 15 * 60;

/**
 * Bölüm 3.1 + 8.3 — admin login.
 * Token sessionStorage'da tutulur; refresh sonrası aynı sekmede oturum korunur.
 * Başarıdan sonra önceki path'e veya /admin/dashboard'a yönlendirir.
 *
 * Hata akışı:
 *  - 400 → fieldErrors form'a bind
 *  - 401 → "Kullanıcı adı veya şifre hatalı" + form üstü banner
 *  - 429 → Retry-After sayacı, form disable
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const expiresAtUtc = useAuthStore((s) => s.expiresAtUtc);
  const loginAction = useAuthStore((s) => s.login);
  const mutation = useLoginMutation();

  const [topError, setTopError] = useState<string | null>(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 429 + 422 ACCOUNT_LOCKED countdown (saniye bazlı geri sayım için aynı timer)
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [tickNow, setTickNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (retryUntil == null) return;
    intervalRef.current = window.setInterval(() => {
      setTickNow(Date.now());
    }, 500);
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [retryUntil]);

  const remainingSeconds =
    retryUntil != null ? Math.max(0, Math.ceil((retryUntil - tickNow) / 1000)) : 0;
  const isLocked = remainingSeconds > 0;

  useEffect(() => {
    if (isLocked) return;
    if (retryUntil != null && remainingSeconds === 0) {
      setRetryUntil(null);
      setIsAccountLocked(false);
    }
  }, [isLocked, retryUntil, remainingSeconds]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { username: "", password: "" },
  });

  // Already-authenticated guard
  if (isAuthenticated && !isTokenExpired(expiresAtUtc)) {
    const from =
      (location.state as { from?: string } | null)?.from ?? "/admin/dashboard";
    return <Navigate to={from} replace />;
  }

  const onSubmit = (data: LoginFormValues) => {
    setTopError(null);
    mutation.mutate(data, {
      onSuccess: (response) => {
        loginAction(response);
        notify.success(`Hoş geldin, ${response.username}.`);
        const from =
          (location.state as { from?: string } | null)?.from ??
          "/admin/dashboard";
        navigate(from, { replace: true });
      },
      onError: (error) => {
        if (!isApiError(error)) {
          setTopError("Beklenmeyen bir hata oluştu.");
          return;
        }
        handleApiError(error);
      },
    });
  };

  const handleApiError = (error: ApiError) => {
    if (error.status === 401) {
      setTopError("Kullanıcı adı veya şifre hatalı.");
      return;
    }
    if (error.status === 422 && error.code === ErrorCode.ACCOUNT_LOCKED) {
      // Backend zaten süre içeren mesaj döndürüyor — onu doğrudan göster.
      const ruleMsg =
        (error.problem?.errors?.rule as string[] | undefined)?.[0] ??
        error.message;
      setTopError(ruleMsg);
      setIsAccountLocked(true);
      setRetryUntil(Date.now() + LOCKOUT_DEFAULT_SECONDS * 1000);
      return;
    }
    if (error.status === 429) {
      const seconds = error.retryAfterSeconds ?? 60;
      setRetryUntil(Date.now() + seconds * 1000);
      // interceptor zaten toast atıyor; ek banner üstte sayaçla
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

  const submitting = mutation.isPending;
  const disabled = submitting || isLocked;

  return (
    <div className="min-h-screen flex flex-col bg-charcoal-900 text-charcoal-100">
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1920&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900 via-charcoal-900/95 to-charcoal-900 pointer-events-none" />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <BarbeyondLogo size="md" variant="light" asLink={false} />
            <p className="mt-4 font-body text-xs tracking-[0.4em] uppercase text-oldGold-500">
              Admin Paneli
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-charcoal-700/60 p-6 md:p-8 space-y-5"
            noValidate
          >
            {topError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-statusBusy/40 bg-statusBusy/10 px-4 py-3 text-sm text-red-200"
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{topError}</p>
              </div>
            )}

            {isLocked && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-oldGold-500/30 bg-oldGold-500/10 px-4 py-3 text-sm text-oldGold-100"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>
                  {isAccountLocked
                    ? `Hesap geçici olarak kilitli. ${formatLockoutClock(remainingSeconds)} sonra tekrar deneyin.`
                    : `Çok fazla deneme. ${remainingSeconds} sn sonra tekrar deneyin.`}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-xs uppercase tracking-[0.2em] text-charcoal-200 mb-2"
              >
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  maxLength={30}
                  disabled={disabled}
                  {...form.register("username")}
                  placeholder="admin"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-charcoal-900/60 border border-charcoal-700/60 text-white placeholder:text-charcoal-300/60
                             focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                             disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-red-400 text-xs mt-1">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-[0.2em] text-charcoal-200 mb-2"
              >
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={disabled}
                  {...form.register("password")}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-charcoal-900/60 border border-charcoal-700/60 text-white placeholder:text-charcoal-300/60
                             focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                             disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={disabled}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-charcoal-300 hover:text-oldGold-500 disabled:opacity-50"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-400 text-xs mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={disabled}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                         bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium tracking-wide
                         transition-colors duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor…
                </>
              ) : isLocked ? (
                <>
                  {isAccountLocked
                    ? `Kilitli — ${formatLockoutClock(remainingSeconds)}`
                    : `${remainingSeconds} sn bekleyin`}
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-charcoal-300">
            Müşteri tarafına dönmek için{" "}
            <a href="/" className="underline hover:text-oldGold-500">
              ana sayfa
            </a>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function mapField(key: string): "username" | "password" | null {
  const k = key.toLowerCase();
  if (k === "username") return "username";
  if (k === "password") return "password";
  return null;
}

function formatLockoutClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
