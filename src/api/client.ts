import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { FieldErrors, ProblemDetails } from "./types";
import { getErrorMessage } from "./errorCodes";
import { notify } from "@/lib/toast";

/**
 * Axios client + RFC 7807 hata yönetimi.
 * Referans: frontenddöküman.md Bölüm 3.3, 3.4, 4 (tümü).
 *
 * Auth store FAZ 5'te yazılacağı için token / 401 davranışı için
 * register edilebilir callback pattern kullanıyoruz:
 *   - registerTokenProvider(() => token)
 *   - registerUnauthorizedHandler(() => { logout(); navigate(...); })
 */

// ============================================================
// Auth callback registry (FAZ 5'te authStore tarafından bağlanacak)
// ============================================================

type TokenProvider = () => string | null | undefined;
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

// ============================================================
// API Error type — interceptor sonrası rejected promise'lerin shape'i
// ============================================================

export interface ApiError {
  status: number;
  /** RFC 7807 extensions.code (sadece 422 için anlamlı) */
  code?: string;
  /** Backend'den gelen TR title (varsa) ya da fallback */
  message: string;
  /** 400 ValidationException → field bazlı mesajlar */
  fieldErrors?: Record<string, string[]>;
  /** Header'dan gelen retry-after (sn) — sadece 429 için */
  retryAfterSeconds?: number;
  /** Debug log'lama için backend correlation id */
  correlationId?: string;
  /** Orijinal axios hatası — gerekirse */
  cause?: AxiosError;
  /** Orijinal RFC 7807 body */
  problem?: ProblemDetails;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value
  );
}

export function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    typeof value === "object" &&
    value !== null &&
    "fieldErrors" in value
  );
}

// ============================================================
// Axios instance
// ============================================================

const baseURL =
  (import.meta.env.VITE_API_BASE as string) || "http://localhost:5157";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, application/problem+json",
  },
  // Bearer token taşıdığımız için credentials gerekmiyor (Bölüm 2 notu).
  withCredentials: false,
});

// ============================================================
// Request interceptor — Authorization header
// ============================================================

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenProvider();
  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// ============================================================
// Response interceptor — RFC 7807 parse + UI etkileri (Bölüm 4.3)
// ============================================================

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ProblemDetails>) => {
    // Network / CORS / abort: response yok
    if (!error.response) {
      const apiError: ApiError = {
        status: 0,
        message:
          error.code === "ERR_CANCELED"
            ? "İstek iptal edildi."
            : "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.",
        cause: error,
      };
      // Cancel'ı toast'lama
      if (error.code !== "ERR_CANCELED") {
        notify.error(apiError.message);
      }
      return Promise.reject(apiError);
    }

    const { status, data, headers } = error.response;
    const code = data?.extensions?.code as string | undefined;
    const correlationId =
      (headers?.["x-correlation-id"] as string | undefined) ?? undefined;

    // Debug log — backend log'larıyla eşleşmek için
    if (correlationId) {
      console.error(
        `[API ${status}]`,
        error.config?.method?.toUpperCase(),
        error.config?.url,
        "correlationId:",
        correlationId,
        data,
      );
    }

    // ---- 401 — JWT yok / expired → auto-logout ----
    if (status === 401) {
      const message =
        data?.errors?.auth?.[0] ??
        "Oturum süreniz doldu, lütfen tekrar giriş yapın.";
      // Login endpoint'inde değilse logout tetikle
      const isLoginCall = error.config?.url?.includes("/auth/login");
      if (!isLoginCall && unauthorizedHandler) {
        unauthorizedHandler();
      }
      const apiError: ApiError = {
        status,
        message,
        problem: data,
        correlationId,
        cause: error,
      };
      return Promise.reject(apiError);
    }

    // ---- 403 — yetki yok ----
    if (status === 403) {
      const message = "Bu işlem için yetkiniz yok.";
      notify.error(message);
      return Promise.reject({
        status,
        message,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 429 — rate limit, Retry-After ----
    if (status === 429) {
      const retryHeader =
        (headers?.["retry-after"] as string | undefined) ?? "60";
      const retryAfterSeconds = Number.parseInt(retryHeader, 10) || 60;
      const message = `Çok fazla istek. ${retryAfterSeconds} saniye sonra tekrar deneyin.`;
      notify.error(message);
      return Promise.reject({
        status,
        message,
        retryAfterSeconds,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 422 — BusinessRuleException, extensions.code ile ----
    if (status === 422) {
      const message = code
        ? getErrorMessage(code)
        : (firstErrorMessage(data) ??
          data?.title ??
          "İşlem kuralları nedeniyle reddedildi.");
      // 422'leri global toast'lama YAPMIYORUZ — caller (sayfa/feature)
      // bağlama göre kararını verecek (örn. CANCEL_WINDOW_PASSED butonu disable etmek).
      // Sadece spam guard / lookup limit gibi UX-bağımsız kodlar için çağıran toast atabilir.
      return Promise.reject({
        status,
        code,
        message,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 409 — Conflict (slot çakışması, izin tekrarı) ----
    if (status === 409) {
      const message =
        firstErrorMessage(data) ??
        data?.title ??
        "Çakışma oluştu, listeyi yenileyip tekrar deneyin.";
      // Toast'lamayı caller'a bırakıyoruz çünkü slot conflict'te farklı UX gerekebilir.
      return Promise.reject({
        status,
        message,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 404 — Not Found ----
    if (status === 404) {
      const message =
        firstErrorMessage(data) ?? data?.title ?? "Kayıt bulunamadı.";
      return Promise.reject({
        status,
        message,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 400 — Validation, fieldErrors normalize ----
    if (status === 400) {
      const fieldErrors = data?.errors ?? {};
      const message =
        firstErrorMessage(data) ?? data?.title ?? "Doğrulama hatası.";
      return Promise.reject({
        status,
        message,
        fieldErrors,
        problem: data,
        correlationId,
        cause: error,
      } satisfies ApiError);
    }

    // ---- 5xx ve diğerleri ----
    const message =
      firstErrorMessage(data) ??
      data?.title ??
      "Bir hata oluştu, lütfen tekrar deneyin.";
    if (status >= 500) {
      notify.error(message);
    }
    return Promise.reject({
      status,
      message,
      problem: data,
      correlationId,
      cause: error,
    } satisfies ApiError);
  },
);

// ============================================================
// Helpers
// ============================================================

/**
 * RFC 7807 errors objesinden ilk mesajı çıkarır.
 * `errors: { auth: ["Şifre hatalı"], ... }` → "Şifre hatalı"
 */
function firstErrorMessage(problem: ProblemDetails | undefined): string | null {
  if (!problem?.errors) return null;
  for (const key of Object.keys(problem.errors)) {
    const arr = problem.errors[key];
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string") {
      return arr[0];
    }
  }
  return null;
}
