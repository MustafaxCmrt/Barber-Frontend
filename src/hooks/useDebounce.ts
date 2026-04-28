import { useEffect, useState } from "react";

/**
 * Debounce — input değerini belirli bir gecikmeden sonra döner.
 * Search input için kullanılır (her tuşta API'ye basmamak için).
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
