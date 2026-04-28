import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { PublicBarberDto } from "@/api/types";
import { getBarberPhoto, getBarberPhotoOnError } from "@/lib/imageFallbacks";

interface BarberCardProps {
  barber: PublicBarberDto;
  delayIndex?: number;
}

/**
 * Berber kartı — Bölüm 10.4 KRİTİK kuralı:
 * Default grayscale → hover'da grayscale-0 + scale-110 (500ms ease-out).
 * Photo URL null gelirse imageFallbacks'tan deterministik unsplash görseli.
 */
export function BarberCard({ barber, delayIndex = 0 }: BarberCardProps) {
  const photo = getBarberPhoto(barber.photoUrl, barber.id || barber.fullName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
    >
      <Link
        to={`/berberler/${barber.id}`}
        className="group relative block overflow-hidden rounded-2xl bg-white shadow-card hover:shadow-card-hover
                   border border-charcoal-100 transition-all duration-300
                   focus:outline-none focus:ring-2 focus:ring-oldGold-500 focus:ring-offset-2"
        aria-label={`${barber.fullName} — detay`}
      >
        <div className="aspect-[3/4] overflow-hidden bg-charcoal-100">
          <img
            src={photo}
            alt={barber.fullName}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackTried !== "1") {
                img.dataset.fallbackTried = "1";
                img.src = getBarberPhotoOnError(barber.id || barber.fullName);
              }
            }}
            className="w-full h-full object-cover
                       grayscale group-hover:grayscale-0
                       scale-100 group-hover:scale-110
                       transition-all duration-500 ease-out"
          />
        </div>

        <div className="p-5 space-y-1">
          <h3 className="font-display text-2xl text-charcoal-900 group-hover:text-oldGold-600 transition-colors duration-200">
            {barber.fullName}
          </h3>
          {barber.specialty && (
            <p className="text-sm text-charcoal-300 tracking-wide">
              {barber.specialty}
            </p>
          )}
          {barber.bio && (
            <p className="text-xs text-charcoal-300 line-clamp-2 mt-2">
              {barber.bio}
            </p>
          )}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 p-4
                     bg-gradient-to-t from-black/80 to-transparent
                     opacity-0 group-hover:opacity-100
                     transition-opacity duration-300"
        >
          <span className="text-white text-sm font-medium tracking-wide">
            Randevu Al →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
