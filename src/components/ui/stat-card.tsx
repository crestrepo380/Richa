import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const ICON_TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted",
  brand: "bg-brand-muted text-brand",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-muted">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="truncate text-xs text-muted">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", ICON_TONES[tone])}>
            <Icon className="size-4" aria-hidden />
          </div>
        )}
      </div>
    </Card>
  );
}
