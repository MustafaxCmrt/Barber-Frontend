import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { usePublicBarberDetail } from "@/features/public/queries";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatDuration, formatMoney } from "@/lib/formatters";
import { getBarberPhoto, getBarberPhotoOnError } from "@/lib/imageFallbacks";

export function BarberDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const query = usePublicBarberDetail(id);

  if (query.isLoading) {
    return <BarberDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon="error"
          title="Berber bulunamadı"
          description="Bu berber pasifleştirilmiş olabilir veya silinmiş."
          action={
            <Link
              to="/berberler"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Berberlere Dön
            </Link>
          }
        />
      </div>
    );
  }

  const barber = query.data;
  const photo = getBarberPhoto(barber.photoUrl, barber.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        to="/berberler"
        className="inline-flex items-center gap-1 text-sm text-charcoal-300 hover:text-oldGold-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Berberlere Dön
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="aspect-[3/4] rounded-2xl overflow-hidden border border-charcoal-100 shadow-card-hover"
        >
          <img
            src={photo}
            alt={barber.fullName}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackTried !== "1") {
                img.dataset.fallbackTried = "1";
                img.src = getBarberPhotoOnError(barber.id || barber.fullName);
              }
            }}
            className="w-full h-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6"
        >
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-charcoal-900">
              {barber.fullName}
            </h1>
            {barber.specialty && (
              <p className="mt-2 text-oldGold-600 tracking-wide">
                {barber.specialty}
              </p>
            )}
          </div>

          {barber.bio && (
            <p className="text-charcoal-500 leading-relaxed">{barber.bio}</p>
          )}

          <div>
            <h2 className="font-display text-2xl text-charcoal-900 mb-4">
              Sunduğu Hizmetler
            </h2>
            {barber.services.length === 0 ? (
              <p className="text-sm text-charcoal-300">
                Bu berbere henüz hizmet atanmamış.
              </p>
            ) : (
              <ul className="divide-y divide-charcoal-100 border border-charcoal-100 rounded-2xl bg-white">
                {barber.services.map((s) => (
                  <li
                    key={s.id}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-charcoal-900">{s.name}</p>
                      <p className="text-xs text-charcoal-300 inline-flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.durationMinutes)}
                      </p>
                    </div>
                    <span className="font-display text-lg text-charcoal-900">
                      {formatMoney(s.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to={`/randevu-al?barberId=${barber.id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg
                       bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium
                       tracking-wide transition-colors duration-200 self-start"
          >
            Randevu Al
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function BarberDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
