/**
 * Berber fotoğrafları için fallback (Bölüm 10.4).
 * Backend `photoUrl` null gelirse buradan deterministik bir görsel seçilir.
 *
 * Strateji:
 *  1) `i.pravatar.cc` — her seed için garantili gerçek insan portresi döner.
 *     Aynı seed → aynı görsel (deterministik), 800x800 px.
 *     Kartın aspect-[3/4] alanı için yeterli.
 *  2) `onError` halinde alternate seed denenir.
 *
 * Not: Backend'den photoUrl gelse bile bozuk olabilir → BarberCard `onError`
 * handler'ı bu fallback'e düşer.
 */

const PRAVATAR_BASE = "https://i.pravatar.cc/800";

/** Seed'den deterministik insan portresi URL'i. */
export function pickBarberFallback(seed: string): string {
  const safe = encodeURIComponent(seed || "barbeyond-default");
  return `${PRAVATAR_BASE}?u=${safe}`;
}

export function getBarberPhoto(
  photoUrl: string | null | undefined,
  seed: string,
): string {
  return photoUrl && photoUrl.length > 0 ? photoUrl : pickBarberFallback(seed);
}

/**
 * Görsel yüklenmezse (404, CORS, network) çağrılır — farklı bir seed ile yeniden dener.
 * Sonsuz loop'u önlemek için <img>'da data-fallback flag kullanıyoruz.
 */
export function getBarberPhotoOnError(seed: string): string {
  return pickBarberFallback(`${seed}-alt`);
}
