"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_ON_HAND } from "@/lib/validation/inventory";

/**
 * On-hand count editor with +/- steppers.
 *
 * The steppers make counting fast and thumb-friendly on a phone in a stockroom
 * — the primary place dealers will use this — while the field stays directly
 * typeable for large counts. Built to be usable by someone with very little
 * technical confidence.
 */
export function QuantityInput({
  value,
  onChange,
  label,
  invalid,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  function clamp(next: number) {
    if (Number.isNaN(next)) return 0;
    return Math.min(MAX_ON_HAND, Math.max(0, Math.trunc(next)));
  }

  return (
    <div className="inline-flex items-stretch rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 0}
        aria-label={`Decrease ${label}`}
        className="grid w-9 place-items-center rounded-l-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_ON_HAND}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(clamp(e.target.valueAsNumber))}
        onFocus={(e) => e.target.select()}
        className={cn(
          "w-16 border-x border-line bg-transparent text-center text-sm font-medium tabular-nums",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          invalid && "text-danger",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled}
        aria-label={`Increase ${label}`}
        className="grid w-9 place-items-center rounded-r-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
