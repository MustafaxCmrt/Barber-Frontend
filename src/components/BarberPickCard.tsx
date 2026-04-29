import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PublicBarberDto } from "@/api/types";
import { getBarberPhoto, getBarberPhotoOnError } from "@/lib/imageFallbacks";

interface BarberPickCardProps {
  barber: PublicBarberDto;
  selected?: boolean;
  onClick?: () => void;
  delayIndex?: number;
}

/**
 * Randevu akışı (FAZ 3) için seçilebilir berber kartı.
 * BarberCard'tan farklı olarak Link değil, button — onClick + selected state alır.
 */
export function BarberPickCard({
  barber,
  selected = false,
  onClick,
  delayIndex = 0,
}: BarberPickCardProps) {
  const photo = getBarberPhoto(barber.photoUrl, barber.id || barber.fullName);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      aria-pressed={selected}
      className={`group relative w-full text-left overflow-hidden rounded-2xl bg-white shadow-card hover:shadow-card-hover
                  border transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-oldGold-500 focus:ring-offset-2 ${
                    selected
                      ? "border-oldGold-500 ring-2 ring-oldGold-500/40"
                      : "border-charcoal-100 hover:border-oldGold-300"
                  }`}
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
          className={`w-full h-full object-cover transition-all duration-500 ease-out ${
            selected
              ? "grayscale-0 scale-105"
              : "grayscale group-hover:grayscale-0 group-hover:scale-110"
          }`}
        />
      </div>

      <div className="p-5 space-y-1">
        <h3
          className={`font-display text-2xl transition-colors duration-200 ${
            selected
              ? "text-oldGold-600"
              : "text-charcoal-900 group-hover:text-oldGold-600"
          }`}
        >
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

      {selected && (
        <div
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-oldGold-500 text-white flex items-center justify-center shadow-md"
          aria-hidden="true"
        >
          <Check className="w-4 h-4" />
        </div>
      )}
    </motion.button>
  );
}
