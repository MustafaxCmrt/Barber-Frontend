import { create } from "zustand";
import type { TokenResponseDto } from "@/api/types";

/**
 * Admin auth store — token sessionStorage'da tutulur.
 *
 * localStorage kullanılmaz; sessionStorage sekme kapanınca temizlenir.
 * Böylece refresh sonrası admin oturumu korunur, kalıcı cihaz oturumu açılmaz.
 */

interface AuthState {
  token: string | null;
  /** ISO UTC ("...Z") — Bölüm 3.1 response'undan gelir. */
  expiresAtUtc: string | null;
  username: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  /** Login response'unu store'a yazar. */
  login: (response: TokenResponseDto) => void;
  /** Token'ı temizler — interceptor 401'de bunu çağırır. */
  logout: () => void;
  /** Aynı login response shape'i — refresh akışı varsa kullanılır. */
  updateToken: (response: TokenResponseDto) => void;
}

const INITIAL_STATE: AuthState = {
  token: null,
  expiresAtUtc: null,
  username: null,
  isAuthenticated: false,
};

const STORAGE_KEY = "barbeyond.admin.auth";

function readStoredAuth(): AuthState {
  if (typeof window === "undefined") return INITIAL_STATE;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;

    const parsed = JSON.parse(raw) as Partial<TokenResponseDto>;
    if (!parsed.accessToken || !parsed.expiresAtUtc || !parsed.username) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return INITIAL_STATE;
    }

    if (isTokenExpired(parsed.expiresAtUtc)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return INITIAL_STATE;
    }

    return {
      token: parsed.accessToken,
      expiresAtUtc: parsed.expiresAtUtc,
      username: parsed.username,
      isAuthenticated: true,
    };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return INITIAL_STATE;
  }
}

function writeStoredAuth(response: TokenResponseDto) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response));
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...readStoredAuth(),

  login: (response) => {
    writeStoredAuth(response);
    set({
      token: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      username: response.username,
      isAuthenticated: true,
    });
  },

  logout: () => {
    clearStoredAuth();
    set({ ...INITIAL_STATE });
  },

  updateToken: (response) => {
    writeStoredAuth(response);
    set({
      token: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      username: response.username,
      isAuthenticated: true,
    });
  },
}));

/**
 * Token süresinin dolmuş olup olmadığını anlık hesaplar.
 * Render sırasında kullanılabilir; yenilenmesi için store değişikliği veya
 * yeniden render gerekir (timer yok). 401 interceptor zaten logout tetikler.
 */
export function isTokenExpired(expiresAtUtc: string | null): boolean {
  if (!expiresAtUtc) return true;
  const t = new Date(expiresAtUtc).getTime();
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}
