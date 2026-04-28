import { type ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: "empty" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "empty",
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = icon === "error" ? AlertCircle : Inbox;
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-charcoal-100 bg-white">
      <Icon
        className={`w-10 h-10 mb-4 ${
          icon === "error" ? "text-statusBusy" : "text-charcoal-200"
        }`}
      />
      <h3 className="font-display text-xl text-charcoal-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-charcoal-300 max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
