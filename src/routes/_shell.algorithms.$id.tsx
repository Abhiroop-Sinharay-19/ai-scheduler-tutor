import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { GanttChart } from "@/components/GanttChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { algorithms } from "@/lib/mock-data";
import { postSchedule } from "@/lib/api";
import type { AlgorithmId, ProcessSpec, ScheduleResult } from "@/lib/scheduling";

const DEMO: ProcessSpec[] = [
  { id: "p1", name: "P1", arrival: 0, burst: 6, priority: 2 },
  { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 1 },
  { id: "p3", name: "P3", arrival: 3, burst: 4, priority: 3 },
];

export const Route = createFileRoute("/_shell/algorithms/$id")({
  loader: ({ params }) => {
    const algo = algorithms.find((a) => a.id === params.id);
    if (!algo) throw notFound();
    return { algo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Algorithm unavailable — Process Scheduling Tutor" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { algo } = loaderData;
    const description = `${algo.name}: ${algo.tagline} Learn how it works, its trade-offs and exam questions.`;
    return {
      meta: [
        { title: `${algo.name} Scheduling — Process Scheduling Tutor` },
        { name: "description", content: description },
        { property: "og:title", content: `${algo.name} Scheduling — Process Scheduling Tutor` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: AlgorithmDetail,
});

function ConceptVisual({ id }: { id: AlgorithmId }) {
  if (id === "rr") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold">
            CPU
          </span>
          <span className="text-muted-foreground">↓</span>
          <span className="rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm">
            Time Quantum = 2 ms
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["P1", "P2", "P3", "P1", "P2"].map((p, i) => (
            <span key={i} className="flex items-center gap-2">
              <span
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
                style={{
                  background: `color-mix(in oklab, var(--chart-${(i % 5) + 1}) 30%, transparent)`,
                  animation: `fade-up 0.5s ${i * 0.12}s both`,
                }}
              >
                {p}
              </span>
              {i < 4 ? <span className="text-primary">→</span> : null}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["Ready queue", "Selection rule", "CPU", "Metrics"].map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          <span
            className="rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm"
            style={{ animation: `fade-up 0.5s ${i * 0.12}s both` }}
          >
            {label}
          </span>
          {i < 3 ? <span className="text-primary">→</span> : null}
        </span>
      ))}
    </div>
  );
}

function AlgorithmDetail() {
  const { algo } = Route.useLoaderData();
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let alive = true;
    void postSchedule({ algorithm: algo.id, quantum: 2, processes: DEMO }).then((r) => {
      if (alive) {
        setResult(r);
        setRunKey((k) => k + 1);
      }
    });
    return () => {
      alive = false;
    };
  }, [algo.id]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link to="/algorithms">
            <ArrowLeft className="size-4" /> All algorithms
          </Link>
        </Button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{algo.name}</h1>
          <Badge variant="outline" className="border-primary/40 text-primary">
            {algo.type}
          </Badge>
          <Badge variant="secondary">{algo.difficulty}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{algo.complexity}</span>
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">{algo.overview}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          <ol className="mt-4 space-y-3">
            {algo.howItWorks.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-border bg-surface/70 font-mono text-xs text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <h3 className="text-sm font-medium">Conceptual visualisation</h3>
            <div className="mt-4">
              <ConceptVisual id={algo.id} />
            </div>
          </div>
        </section>

        <section className="panel space-y-5 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" /> Advantages
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {algo.advantages.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="size-4" /> Disadvantages
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {algo.disadvantages.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Interactive simulation</h2>
            <p className="text-sm text-muted-foreground">
              P1(0,6) · P2(1,3) · P3(3,4) scheduled with {algo.name}.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/simulator">Open full simulator</Link>
          </Button>
        </div>
        <div className="mt-5">
          {result ? (
            <GanttChart gantt={result.gantt} names={DEMO.map((p) => p.name)} runKey={runKey} />
          ) : (
            <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
          )}
        </div>
        {result ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { k: "Avg waiting", v: `${result.metrics.avgWaiting} ms` },
              { k: "Avg turnaround", v: `${result.metrics.avgTurnaround} ms` },
              { k: "CPU utilisation", v: `${result.metrics.cpuUtilization}%` },
            ].map((m) => (
              <div key={m.k} className="rounded-xl border border-border bg-surface/60 px-4 py-3">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                  {m.k}
                </span>
                <span className="mt-1 block font-mono text-sm">{m.v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-lg font-semibold tracking-tight">Common exam questions</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {algo.examQuestions.map((q) => (
              <li key={q} className="rounded-xl border border-border bg-surface/60 px-4 py-3">
                {q}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-5" variant="outline">
            <Link to="/quizzes">Practice problems</Link>
          </Button>
        </section>

        <section className="panel flex h-[520px] flex-col p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="size-4 text-primary" /> AI explanation
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{algo.aiExplanation}</p>
          <div className="mt-4 min-h-0 flex-1">
            <AIChat
              context={{ page: "/algorithms", algorithm: algo.id }}
              quickPrompts={[
                `Explain ${algo.name} step by step`,
                `Give me a ${algo.name} problem`,
                "Simplify that",
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
