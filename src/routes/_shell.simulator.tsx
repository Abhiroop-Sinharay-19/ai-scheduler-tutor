import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Cpu, Play, RotateCcw } from "lucide-react";
import { GanttChart, processColor } from "@/components/GanttChart";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ProcessTable } from "@/components/ProcessTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postSchedule } from "@/lib/api";
import { ALGORITHM_LABELS, type AlgorithmId, type ProcessSpec, type ScheduleResult } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/simulator")({
  head: () => ({
    meta: [
      { title: "Scheduling Simulator — Process Scheduling Tutor" },
      { name: "description", content: "Run FCFS, SJF, SRTF, Round Robin and Priority scheduling with animated Gantt charts and step-by-step CPU state." },
      { property: "og:title", content: "Scheduling Simulator — Process Scheduling Tutor" },
      { property: "og:description", content: "Animated Gantt charts, live metrics and a step-by-step CPU timeline for every scheduling algorithm." },
    ],
  }),
  component: Simulator,
});

const DEFAULT_PROCESSES: ProcessSpec[] = [
  { id: "p1", name: "P1", arrival: 0, burst: 8, priority: 2 },
  { id: "p2", name: "P2", arrival: 1, burst: 4, priority: 1 },
  { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 3 },
];

function Simulator() {
  const [processes, setProcesses] = useState<ProcessSpec[]>(DEFAULT_PROCESSES);
  const [algorithm, setAlgorithm] = useState<AlgorithmId>("srtf");
  const [quantum, setQuantum] = useState(2);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [stepMode, setStepMode] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const names = useMemo(() => processes.map((p) => p.name), [processes]);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await postSchedule({ algorithm, quantum, processes });
    setResult(res);
    setStepIndex(0);
    setRunKey((k) => k + 1);
    setLoading(false);
  }, [algorithm, quantum, processes]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = result?.steps[Math.min(stepIndex, (result?.steps.length ?? 1) - 1)] ?? null;

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground">
          <Cpu className="size-3.5 text-primary" /> Interactive engine
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Process Scheduling Simulator</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Edit the process table, pick a policy and watch the schedule build itself — then inspect every metric.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="panel space-y-5 p-6 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as AlgorithmId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ALGORITHM_LABELS) as AlgorithmId[]).map((id) => (
                    <SelectItem key={id} value={id}>{ALGORITHM_LABELS[id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {algorithm === "rr" ? (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="quantum">Time Quantum</Label>
                <Input
                  id="quantum"
                  inputMode="numeric"
                  value={quantum}
                  onChange={(e) => setQuantum(Math.max(1, Number(e.target.value.replace(/[^\d]/g, "")) || 1))}
                  className="font-mono"
                />
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <Button onClick={() => void run()} disabled={loading} className="gap-2">
                <Play className="size-4" /> {loading ? "Running…" : "Run Simulation"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setProcesses(DEFAULT_PROCESSES)} aria-label="Reset processes">
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </div>

          <ProcessTable processes={processes} algorithm={algorithm} onChange={setProcesses} />
        </section>

        <section className="panel space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="stepmode" className="text-sm font-medium">Step-by-Step Mode</Label>
              <p className="text-xs text-muted-foreground">Inspect the CPU at each time unit.</p>
            </div>
            <Switch id="stepmode" checked={stepMode} onCheckedChange={setStepMode} />
          </div>

          {stepMode && step ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">TIME = {step.time} ms</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0} aria-label="Previous step">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStepIndex((i) => Math.min((result?.steps.length ?? 1) - 1, i + 1))}
                    disabled={stepIndex >= (result?.steps.length ?? 1) - 1}
                    aria-label="Next step"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface/60 p-4">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">CPU</span>
                {step.running ? (
                  <div
                    className="mt-2 grid h-14 place-items-center rounded-lg border border-border text-lg font-semibold animate-scale-in"
                    style={{ background: `color-mix(in oklab, ${processColor(step.running, names)} 40%, transparent)` }}
                  >
                    {step.running}
                  </div>
                ) : (
                  <div className="mt-2 grid h-14 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    idle
                  </div>
                )}
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Ready queue</span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {step.ready.length ? (
                    step.ready.map((n, i) => (
                      <span key={`${n}-${i}`} className="flex items-center gap-1.5">
                        <span
                          className="rounded-lg border border-border px-2.5 py-1 text-sm font-medium"
                          style={{ background: `color-mix(in oklab, ${processColor(n, names)} 25%, transparent)` }}
                        >
                          {n}
                        </span>
                        {i < step.ready.length - 1 ? <span className="text-muted-foreground">→</span> : null}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">empty</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Newly arrived</span>
                  <p className="mt-1 font-medium">{step.arrived.length ? step.arrived.join(", ") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed</span>
                  <p className="mt-1 font-medium text-success">{step.completed.length ? step.completed.join(", ") : "—"}</p>
                </div>
              </div>

              <p className="rounded-xl border border-border bg-surface/60 p-3 text-xs text-muted-foreground">{step.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Turn on step mode to walk the scheduler forward one time unit at a time.
            </div>
          )}
        </section>
      </div>

      <section className={cn("panel p-6", !result && "opacity-70")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Gantt Chart</h2>
          <span className="text-xs text-muted-foreground">{ALGORITHM_LABELS[algorithm]}{algorithm === "rr" ? ` · q = ${quantum}` : ""}</span>
        </div>
        <div className="mt-5">
          {result ? (
            <GanttChart gantt={result.gantt} names={names} runKey={runKey} activeTime={stepMode ? (step?.time ?? null) : null} />
          ) : (
            <div className="h-32 animate-pulse rounded-2xl bg-muted/60" />
          )}
        </div>
      </section>

      {result ? (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold tracking-tight">Performance Metrics</h2>
          <MetricsPanel result={result} />
        </section>
      ) : null}
    </div>
  );
}
