import { useMemo, useState } from "react";
import type { GanttSlice } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function processColor(name: string, names: string[]) {
  const i = names.indexOf(name);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length] as string;
}

interface Props {
  gantt: GanttSlice[];
  names: string[];
  runKey: number;
  activeTime?: number | null;
  onSelect?: (slice: GanttSlice) => void;
}

export function GanttChart({ gantt, names, runKey, activeTime = null, onSelect }: Props) {
  const [selected, setSelected] = useState<GanttSlice | null>(null);
  const [hover, setHover] = useState<GanttSlice | null>(null);

  const start = gantt[0]?.start ?? 0;
  const end = gantt[gantt.length - 1]?.end ?? 0;
  const span = Math.max(1, end - start);
  const ticks = useMemo(() => {
    const set = new Set<number>();
    gantt.forEach((s) => {
      set.add(s.start);
      set.add(s.end);
    });
    return [...set].sort((a, b) => a - b);
  }, [gantt]);

  if (!gantt.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        Run a simulation to generate the Gantt chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[560px]">
          <div className="flex h-20 w-full gap-1">
            {gantt.map((slice, i) => {
              const width = ((slice.end - slice.start) / span) * 100;
              const isActive =
                activeTime !== null && activeTime >= slice.start && activeTime < slice.end;
              return (
                <button
                  key={`${runKey}-${slice.name}-${slice.start}`}
                  type="button"
                  onMouseEnter={() => setHover(slice)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    setSelected(slice);
                    onSelect?.(slice);
                  }}
                  style={{
                    width: `${width}%`,
                    background: slice.idle
                      ? "color-mix(in oklab, var(--muted) 80%, transparent)"
                      : `color-mix(in oklab, ${processColor(slice.name, names)} 78%, transparent)`,
                    animation: `grow-x 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s both`,
                    transformOrigin: "left center",
                  }}
                  className={cn(
                    "group relative flex min-w-[34px] items-center justify-center rounded-xl border border-border/60 text-sm font-semibold text-foreground transition-all",
                    "hover:brightness-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive && "ring-2 ring-ring",
                    selected?.start === slice.start && "ring-2 ring-ring",
                  )}
                  aria-label={`${slice.name} from ${slice.start} to ${slice.end}`}
                >
                  <span className={cn(slice.idle && "text-muted-foreground")}>
                    {slice.idle ? "idle" : slice.name}
                  </span>
                  <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <span className="block font-semibold">
                      {slice.idle ? "CPU idle" : `Process ${slice.name}`}
                    </span>
                    <span className="block text-muted-foreground">
                      Start {slice.start} · End {slice.end}
                    </span>
                    <span className="block text-muted-foreground">
                      Execution {slice.end - slice.start} ms
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-2 h-5">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 font-mono text-[11px] text-muted-foreground"
                style={{ left: `${((t - start) / span) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface/60 p-4 text-sm text-muted-foreground animate-fade-in">
        {selected ? (
          <>
            <span className="font-semibold text-foreground">
              Why {selected.idle ? "idle" : selected.name} here?{" "}
            </span>
            {selected.reason}
          </>
        ) : hover ? (
          <>
            <span className="font-semibold text-foreground">
              {hover.idle ? "CPU idle" : hover.name}:{" "}
            </span>
            {hover.start} → {hover.end} ms ({hover.end - hover.start} ms of CPU). Click the block
            for the scheduling reason.
          </>
        ) : (
          "Hover a block for timings, click it to get the AI explanation of why that process was chosen."
        )}
      </div>
    </div>
  );
}
