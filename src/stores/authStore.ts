import { create } from "zustand";
import type { TokenResponseDto } from "@/api/types";

/**
 * Admin auth store — Bölüm 3.2 önerisi: token MEMORY'de tutulur.
 *
 * KRİTİK: localStorage / sessionStorage KULLANILMAZ.
 * Sayfa yenilenince token kaybolur ve kullanıcı tekrar login'e döner —
 * admin paneli için kabul edilebilir UX (XSS yüzeyini sıfıra indirir).
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

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...INITIAL_STATE,

  login: (response) =>
    set({
      token: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      username: response.username,
      isAuthenticated: true,
    }),

  logout: () => set({ ...INITIAL_STATE }),

  updateToken: (response) =>
    set({
      token: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      username: response.username,
      isAuthenticated: true,
    }),
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
