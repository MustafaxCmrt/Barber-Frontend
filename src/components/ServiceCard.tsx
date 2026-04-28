import { motion } from "framer-motion";
import { Clock, Scissors } from "lucide-react";
import type { PublicServiceDto } from "@/api/types";
import { formatDuration, formatMoney } from "@/lib/formatters";

interface ServiceCardProps {
  service: PublicServiceDto;
  delayIndex?: number;
  onClick?: () => void;
  selected?: boolean;
}

export function ServiceCard({
  service,
  delayIndex = 0,
  onClick,
  selected = false,
}: ServiceCardProps) {
  const Component = onClick ? motion.button : motion.div;
  const interactive = !!onClick;

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05, ease: "easeOut" }}
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={`relative w-full text-left rounded-2xl bg-white border shadow-card hover:shadow-card-hover
                  transition-all duration-300 p-5 flex flex-col gap-3
                  ${
                    selected
                      ? "border-oldGold-500 ring-2 ring-oldGold-500/40"
                      : "border-charcoal-100 hover:border-oldGold-300"
                  }`}
      aria-pressed={interactive ? selected : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-oldGold-600">
          <Scissors className="w-5 h-5" />
          <h3 className="font-display text-xl text-charcoal-900">
            {service.name}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-auto">
        <div className="flex items-center gap-1 text-sm text-charcoal-300">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(service.durationMinutes)}</span>
        </div>
        <span className="font-display text-lg text-charcoal-900">
          {formatMoney(service.price)}
        </span>
      </div>
    </Component>
  );
}
