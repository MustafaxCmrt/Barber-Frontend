import { type HTMLAttributes } from "react";

/**
 * Loading state için animate-pulse skeleton (Bölüm 10.5).
 */
export function Skeleton({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-charcoal-100 rounded-lg ${className}`}
      aria-hidden="true"
      {...rest}
    />
  );
}

export function BarberCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-charcoal-100 shadow-card">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 space-y-3">
      <Skeleton className="h-5 w-3/5" />
      <div className="flex justify-between gap-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
