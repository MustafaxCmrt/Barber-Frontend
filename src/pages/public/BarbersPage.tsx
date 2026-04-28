import { useState } from "react";
import { BarberCard } from "@/components/BarberCard";
import { BarberCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { usePublicBarbers } from "@/features/public/queries";

const PAGE_SIZE = 12;

export function BarbersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const query = usePublicBarbers({
    Page: page,
    PageSize: PAGE_SIZE,
    Search: debouncedSearch || undefined,
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-charcoal-900">
            Berberlerimiz
          </h1>
          <p className="text-charcoal-300 mt-2">
            Deneyimli, tutkulu, detaycı bir ekip.
          </p>
        </div>
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Berber adı ara…"
          ariaLabel="Berber arama"
        />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <BarberCardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon="error"
          title="Berberler yüklenemedi"
          description="Backend'e bağlanılamadı. Lütfen tekrar deneyin."
          action={
            <button
              type="button"
              onClick={() => query.refetch()}
              className="px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm transition-colors"
            >
              Tekrar Dene
            </button>
          }
        />
      ) : query.data && query.data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {query.data.items.map((b, i) => (
              <BarberCard key={b.id} barber={b} delayIndex={i} />
            ))}
          </div>
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            totalPages={query.data.totalPages}
            totalCount={query.data.totalCount}
            hasNext={query.data.hasNext}
            hasPrevious={query.data.hasPrevious}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Berber bulunamadı"
          description={
            debouncedSearch
              ? `"${debouncedSearch}" araması için sonuç yok.`
              : "Henüz aktif berber yok."
          }
        />
      )}
    </div>
  );
}
