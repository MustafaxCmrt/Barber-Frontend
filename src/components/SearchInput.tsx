import { Search, X } from "lucide-react";
import { type ChangeEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara…",
  ariaLabel = "Arama",
}: SearchInputProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-charcoal-100 bg-white
                   text-sm text-charcoal-500 placeholder:text-charcoal-200
                   focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                   transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-charcoal-300 hover:text-charcoal-500 hover:bg-charcoal-50"
          aria-label="Aramayı temizle"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
