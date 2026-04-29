import { Check } from "lucide-react";

export interface StepDef {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: StepDef[];
  current: number;
}

/**
 * 5 adımlık üst gösterge (FAZ 3).
 * - Aktif: bg-oldGold-500 text-white
 * - Tamamlanan: bg-oldGold-100 text-oldGold-600 (✓ ikon)
 * - Gelecek: bg-charcoal-100 text-charcoal-300
 *
 * Mobilde sadece numaralar görünür, başlıklar md+ ekranda eklenir.
 */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol
      className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full"
      aria-label="Randevu alma adımları"
    >
      {steps.map((step, idx) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        const stateClass = isActive
          ? "bg-oldGold-500 text-white border-oldGold-500"
          : isDone
            ? "bg-oldGold-100 text-oldGold-600 border-oldGold-200"
            : "bg-charcoal-100 text-charcoal-300 border-charcoal-100";

        const labelClass = isActive
          ? "text-charcoal-900"
          : isDone
            ? "text-oldGold-600"
            : "text-charcoal-300";

        return (
          <li
            key={step.id}
            className="flex items-center gap-2 md:gap-3 flex-1 min-w-0"
            aria-current={isActive ? "step" : undefined}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border text-sm font-medium transition-colors ${stateClass}`}
              aria-hidden="true"
            >
              {isDone ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <span
              className={`hidden md:block font-body text-sm tracking-wide truncate ${labelClass}`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span
                className={`hidden md:block flex-1 h-px ${
                  isDone ? "bg-oldGold-200" : "bg-charcoal-100"
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
