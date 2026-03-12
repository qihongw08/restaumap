"use client";

import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
  label: string;
  value: number;
  max: number;
  onChange: (val: number) => void;
  emoji?: string;
}

export function ScoreSelector({
  label,
  value,
  max,
  onChange,
  emoji,
}: ScoreSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {emoji && <span className="mr-1">{emoji}</span>}
          {label}
        </label>
        <span className="text-sm font-black italic text-primary">
          {value}/{max}
        </span>
      </div>
      <div className="flex w-full justify-between gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-all active:scale-90",
              n < value
                ? "border-transparent bg-primary/70 text-primary-foreground"
                : n === value
                  ? "scale-110 border-transparent bg-primary text-primary-foreground shadow-[0_0_0_3px_rgba(255,215,0,0.35)]"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
