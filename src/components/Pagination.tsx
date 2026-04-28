import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Bölüm 5 — sayfa kontrolü. Backend zaten clamp ediyor, biz UX için disable ediyoruz.
 */
export function Pagination({
  page,
  pageSize,
  totalPages,
  totalCount,
  hasNext,
  hasPrevious,
  onPageChange,
}: PaginationProps) {
  if (totalCount <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <nav
      aria-label="Sayfa gezintisi"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8"
    >
      <p className="text-sm text-charcoal-300">
        <span className="font-medium text-charcoal-500">{start}</span>
        {"–"}
        <span className="font-medium text-charcoal-500">{end}</span>
        {" / "}
        <span className="font-medium text-charcoal-500">{totalCount}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg
                     border border-charcoal-100 bg-white text-charcoal-500
                     hover:border-oldGold-500 hover:text-oldGold-600
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-charcoal-100 disabled:hover:text-charcoal-500
                     transition-colors duration-200"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Önceki</span>
        </button>

        <span className="px-3 py-2 text-sm font-medium text-charcoal-500">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg
                     border border-charcoal-100 bg-white text-charcoal-500
                     hover:border-oldGold-500 hover:text-oldGold-600
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-charcoal-100 disabled:hover:text-charcoal-500
                     transition-colors duration-200"
          aria-label="Sonraki sayfa"
        >
          <span className="text-sm">Sonraki</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
