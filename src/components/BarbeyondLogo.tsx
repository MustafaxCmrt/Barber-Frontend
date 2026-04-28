import { Link } from "react-router-dom";

interface BarbeyondLogoProps {
  /** Header için "sm", landing hero için "lg" */
  size?: "sm" | "md" | "lg";
  /** "light" — siyah zemin, "dark" — beyaz zemin */
  variant?: "light" | "dark";
  /** true → ana sayfaya link, false → sadece görsel */
  asLink?: boolean;
}

/**
 * Barbeyond logo bileşeni — Bölüm 11'in minimal versiyonu.
 * Playfair Display 900 (Black) + Montserrat tracking ile By Hazen Gülfırat.
 *
 * Tam siyah arka planlı premium versiyon ileride landing hero'da kullanılabilir.
 */
export function BarbeyondLogo({
  size = "md",
  variant = "dark",
  asLink = true,
}: BarbeyondLogoProps) {
  const sizeClasses = {
    sm: { title: "text-2xl", sub: "text-[0.6rem]" },
    md: { title: "text-3xl", sub: "text-[0.65rem]" },
    lg: { title: "text-6xl md:text-7xl", sub: "text-xs md:text-sm" },
  }[size];

  const colors =
    variant === "light"
      ? { title: "text-oldGold-500", sub: "text-charcoal-100/80" }
      : { title: "text-charcoal-900", sub: "text-oldGold-600" };

  const content = (
    <div className="inline-flex flex-col items-start leading-none select-none">
      <span
        className={`font-display font-black tracking-tight ${sizeClasses.title} ${colors.title}`}
        style={{ textShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
      >
        Barbeyond
      </span>
      <span
        className={`font-body uppercase tracking-[0.35em] mt-1 ${sizeClasses.sub} ${colors.sub}`}
      >
        By Hazen Gülfırat
      </span>
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        aria-label="Barbeyond ana sayfa"
        className="focus:outline-none focus:ring-2 focus:ring-oldGold-500 focus:ring-offset-2 rounded"
      >
        {content}
      </Link>
    );
  }
  return content;
}
