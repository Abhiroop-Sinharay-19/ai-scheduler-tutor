import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AlgorithmId, ProcessSpec } from "@/lib/scheduling";
import { processColor } from "./GanttChart";

interface Props {
  processes: ProcessSpec[];
  algorithm: AlgorithmId;
  onChange: (next: ProcessSpec[]) => void;
}

export function ProcessTable({ processes, algorithm, onChange }: Props) {
  const names = processes.map((p) => p.name);
  const showPriority = algorithm === "priority";

  const update = (id: string, key: keyof ProcessSpec, raw: string) => {
    const value = Math.max(0, Number(raw.replace(/[^\d]/g, "")) || 0);
    onChange(processes.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };

  const add = () => {
    const n = processes.length + 1;
    onChange([
      ...processes,
      { id: crypto.randomUUID(), name: `P${n}`, arrival: n - 1, burst: 3, priority: 2 },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-surface-2/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Process</th>
              <th className="px-4 py-3">Arrival</th>
              <th className="px-4 py-3">Burst</th>
              {showPriority ? <th className="px-4 py-3">Priority</th> : null}
              <th className="px-4 py-3 text-right">—</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => (
              <tr key={p.id} className="border-t border-border/70 transition-colors hover:bg-surface/60">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: processColor(p.name, names) }}
                    />
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Input
                    inputMode="numeric"
                    value={p.arrival}
                    onChange={(e) => update(p.id, "arrival", e.target.value)}
                    className="h-9 w-20 font-mono"
                    aria-label={`${p.name} arrival time`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Input
                    inputMode="numeric"
                    value={p.burst}
                    onChange={(e) => update(p.id, "burst", e.target.value)}
                    className="h-9 w-20 font-mono"
                    aria-label={`${p.name} burst time`}
                  />
                </td>
                {showPriority ? (
                  <td className="px-4 py-2.5">
                    <Input
                      inputMode="numeric"
                      value={p.priority}
                      onChange={(e) => update(p.id, "priority", e.target.value)}
                      className="h-9 w-20 font-mono"
                      aria-label={`${p.name} priority`}
                    />
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onChange(processes.filter((x) => x.id !== p.id))}
                    disabled={processes.length <= 1}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Add process
        </Button>
        {showPriority ? (
          <span className="text-xs text-muted-foreground">Lower priority value = higher priority.</span>
        ) : null}
      </div>
    </div>
  );
}
