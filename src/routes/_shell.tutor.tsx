import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Cpu, History, PlusCircle } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { algorithms } from "@/lib/mock-data";
import type { AlgorithmId, ProcessSpec } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — Process Scheduling Tutor" },
      { name: "description", content: "Ask an AI tutor anything about CPU scheduling and get step-by-step, context-aware explanations." },
      { property: "og:title", content: "AI Tutor — Process Scheduling Tutor" },
      { property: "og:description", content: "Context-aware AI tutoring for FCFS, SJF, SRTF, Round Robin and Priority scheduling." },
    ],
  }),
  component: Tutor,
});

const THREADS = [
  { id: "t1", title: "Why does SRTF preempt P1?", topic: "SRTF", when: "Today" },
  { id: "t2", title: "Round Robin quantum tuning", topic: "Round Robin", when: "Yesterday" },
  { id: "t3", title: "Proving SJF optimality", topic: "SJF", when: "2 days ago" },
  { id: "t4", title: "Convoy effect examples", topic: "FCFS", when: "Last week" },
];

const ACTIVE_PROBLEM: ProcessSpec[] = [
  { id: "p1", name: "P1", arrival: 0, burst: 8, priority: 2 },
  { id: "p2", name: "P2", arrival: 1, burst: 4, priority: 1 },
  { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 3 },
];

function Tutor() {
  const [thread, setThread] = useState(THREADS[0]!.id);
  const [algorithm, setAlgorithm] = useState<AlgorithmId>("srtf");
  const info = algorithms.find((a) => a.id === algorithm)!;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">AI Tutor</h1>
        <p className="mt-2 text-muted-foreground">Your scheduling tutor knows the problem you're working on.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-4">
        <aside className="panel hidden p-4 xl:block">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-sm font-medium"><History className="size-4 text-primary" /> Conversations</span>
            <Button variant="ghost" size="icon" aria-label="New conversation"><PlusCircle className="size-4" /></Button>
          </div>
          <div className="mt-4 space-y-1.5">
            {THREADS.map((t) => (
              <button
                key={t.id}
                onClick={() => setThread(t.id)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                  thread === t.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface/70",
                )}
              >
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block text-[11px] text-muted-foreground/80">{t.topic} · {t.when}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel flex h-[70vh] min-h-[520px] flex-col p-4 xl:col-span-2">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary"><Sparkles className="size-4" /></span>
            <div>
              <p className="text-sm font-medium">Scheduling Tutor</p>
              <p className="text-[11px] text-muted-foreground">Context: {info.name} · active problem attached</p>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AIChat
              context={{ page: "/tutor", algorithm, problem: ACTIVE_PROBLEM }}
              quickPrompts={[
                "Explain FCFS",
                "Give me a Round Robin problem",
                "Why does SJF minimize waiting time?",
                "Test me on SRTF",
              ]}
            />
          </div>
        </section>

        <aside className="panel space-y-5 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium"><Cpu className="size-4 text-primary" /> Context panel</h3>
            <p className="mt-1 text-xs text-muted-foreground">The tutor references this while answering.</p>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Active algorithm</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {algorithms.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAlgorithm(a.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    algorithm === a.id
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Active problem</span>
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface-2/60 text-left text-muted-foreground">
                  <tr><th className="px-3 py-2">P</th><th className="px-3 py-2">AT</th><th className="px-3 py-2">BT</th><th className="px-3 py-2">Pr</th></tr>
                </thead>
                <tbody className="font-mono">
                  {ACTIVE_PROBLEM.map((p) => (
                    <tr key={p.id} className="border-t border-border/70">
                      <td className="px-3 py-1.5">{p.name}</td>
                      <td className="px-3 py-1.5">{p.arrival}</td>
                      <td className="px-3 py-1.5">{p.burst}</td>
                      <td className="px-3 py-1.5">{p.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Key idea</span>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{info.aiExplanation}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
