/**
 * Berber fotoğrafları için nötr fallback.
 * Backend `photoUrl` null dönerse veya URL yüklenemezse rastgele insan fotoğrafı
 * yerine aynı placeholder kullanılır.
 */

const BARBER_PHOTO_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#F4F1EA"/>
  <circle cx="400" cy="304" r="112" fill="#D4AF37" opacity="0.34"/>
  <path d="M190 716c32-134 116-218 210-218s178 84 210 218H190z" fill="#1A1A1A" opacity="0.18"/>
  <path d="M260 156c42-42 89-63 140-63s98 21 140 63" fill="none" stroke="#1A1A1A" stroke-width="28" stroke-linecap="round" opacity="0.18"/>
</svg>
`)}`;

export function getBarberPhoto(
  photoUrl: string | null | undefined,
  _seed: string,
): string {
  const trimmed = photoUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : BARBER_PHOTO_PLACEHOLDER;
}

/** Görsel yüklenmezse (404, CORS, network) nötr placeholder'a düşer. */
export function getBarberPhotoOnError(_seed: string): string {
  return BARBER_PHOTO_PLACEHOLDER;
}
