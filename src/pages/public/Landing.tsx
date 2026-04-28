import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { BarberCard } from "@/components/BarberCard";
import { ServiceCard } from "@/components/ServiceCard";
import {
  BarberCardSkeleton,
  ServiceCardSkeleton,
} from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  usePublicBarbers,
  usePublicServices,
} from "@/features/public/queries";

export function LandingPage() {
  const featuredBarbers = usePublicBarbers({ Page: 1, PageSize: 3 });
  const featuredServices = usePublicServices({ Page: 1, PageSize: 3 });

  return (
    <div>
      <Hero />

      <FeaturedSection
        title="Hizmetlerimiz"
        href="/hizmetler"
        linkLabel="Tüm hizmetler"
      >
        {featuredServices.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredServices.isError ? (
          <EmptyState
            icon="error"
            title="Hizmetler yüklenemedi"
            description="Backend'e bağlanılamadı. Lütfen tekrar deneyin."
            action={
              <button
                type="button"
                onClick={() => featuredServices.refetch()}
                className="px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
              >
                Tekrar Dene
              </button>
            }
          />
        ) : featuredServices.data?.items.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredServices.data.items.map((s, i) => (
              <ServiceCard key={s.id} service={s} delayIndex={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Henüz hizmet yok"
            description="Yakında eklenecek."
          />
        )}
      </FeaturedSection>

      <FeaturedSection
        title="Berberlerimiz"
        href="/berberler"
        linkLabel="Tüm berberler"
        muted
      >
        {featuredBarbers.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <BarberCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredBarbers.isError ? (
          <EmptyState
            icon="error"
            title="Berberler yüklenemedi"
            description="Backend'e bağlanılamadı. Lütfen tekrar deneyin."
            action={
              <button
                type="button"
                onClick={() => featuredBarbers.refetch()}
                className="px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
              >
                Tekrar Dene
              </button>
            }
          />
        ) : featuredBarbers.data?.items.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredBarbers.data.items.map((b, i) => (
              <BarberCard key={b.id} barber={b} delayIndex={i} />
            ))}
          </div>
        ) : (
          <EmptyState title="Henüz berber yok" description="Yakında eklenecek." />
        )}
      </FeaturedSection>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-charcoal-900 text-white">
      <div
        className="absolute inset-0 opacity-30 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1920&q=80)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900 via-charcoal-900/80 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl space-y-6"
        >
          <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-500">
            Barbeyond — By Hazen Gülfırat
          </p>
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tight text-white leading-[1.05]">
            Klasiğin <span className="text-oldGold-500">otoritesi</span>,
            <br />
            modernin zarafeti.
          </h1>
          <p className="text-lg text-charcoal-100 max-w-xl">
            Saç, sakal ve bakım için 1920'lerin İngiliz berber dükkanlarından
            esinlenmiş, modern dokunuşlarla hazırlanmış bir deneyim.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/randevu-al"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white font-medium tracking-wide transition-colors duration-200"
            >
              Randevu Al
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/berberler"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 hover:border-oldGold-500 text-white font-medium tracking-wide transition-colors duration-200"
            >
              Berberleri Gör
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface FeaturedSectionProps {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
  muted?: boolean;
}

function FeaturedSection({
  title,
  href,
  linkLabel,
  children,
  muted,
}: FeaturedSectionProps) {
  return (
    <section className={muted ? "bg-charcoal-50/40" : ""}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl md:text-4xl text-charcoal-900">
            {title}
          </h2>
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-oldGold-600 hover:text-oldGold-700 transition-colors"
          >
            {linkLabel}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}
