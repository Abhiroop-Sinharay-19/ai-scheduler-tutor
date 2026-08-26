import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BrainCircuit,
  Cpu,
  GaugeCircle,
  GraduationCap,
  LineChart,
  ListChecks,
  Play,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { GanttChart } from "@/components/GanttChart";
import { runSchedule, type ProcessSpec } from "@/lib/scheduling";
import heroImage from "@/assets/hero-scheduling.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Process Scheduling Tutor — Learn CPU Scheduling Visually" },
      {
        name: "description",
        content:
          "Master FCFS, SJF, SRTF, Round Robin and Priority scheduling with animated Gantt charts, step-by-step simulations and a built-in AI tutor.",
      },
      { property: "og:title", content: "Process Scheduling Tutor — Learn CPU Scheduling Visually" },
      {
        property: "og:description",
        content: "Animated Gantt charts, step-by-step CPU scheduling simulations and an AI tutor that explains every decision.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BrainCircuit, title: "AI Tutor", desc: "Ask why P2 waited 4ms and get a step-referenced answer, not a textbook paragraph." },
  { icon: GaugeCircle, title: "Live Simulator", desc: "Edit arrival, burst and priority; the Gantt chart and metrics recompute instantly." },
  { icon: Timer, title: "Step-by-Step Mode", desc: "Advance one time unit at a time and watch the ready queue evolve." },
  { icon: ListChecks, title: "Algorithm Library", desc: "FCFS, SJF, SRTF, Round Robin and Priority — with trade-offs and exam questions." },
  { icon: BarChart3, title: "Gamified Quizzes", desc: "Instant explanations, streaks and weak-area detection after every attempt." },
  { icon: LineChart, title: "Progress Analytics", desc: "Mastery radar, quiz trend and a study heatmap that shows what to revise." },
];

const ALGORITHMS = [
  { id: "fcfs", name: "FCFS", note: "Simplest, convoy effect" },
  { id: "sjf", name: "SJF", note: "Optimal avg waiting" },
  { id: "srtf", name: "SRTF", note: "Preemptive SJF" },
  { id: "rr", name: "Round Robin", note: "Fair time slices" },
  { id: "priority", name: "Priority", note: "Starvation risk" },
] as const;

function Landing() {
  const demoProcesses: ProcessSpec[] = [
    { id: "p1", name: "P1", arrival: 0, burst: 7, priority: 2 },
    { id: "p2", name: "P2", arrival: 2, burst: 4, priority: 1 },
    { id: "p3", name: "P3", arrival: 4, burst: 1, priority: 3 },
    { id: "p4", name: "P4", arrival: 5, burst: 4, priority: 2 },
  ];
  const demo = runSchedule(demoProcesses, "rr", 3);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46rem]" aria-hidden>
        <div className="absolute left-1/4 top-[-10rem] size-[36rem] rounded-full bg-primary/18 blur-3xl animate-float" />
        <div className="absolute right-[-6rem] top-24 size-[30rem] rounded-full bg-accent/14 blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-[0.35]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <span className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
            <Cpu className="size-4.5 text-primary-foreground" />
          </span>
          Scheduling Tutor
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/algorithms">Algorithms</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/login">Open app</Link></Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-12 lg:grid-cols-2 lg:pt-20">
        <div className="animate-fade-up">
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            <Sparkles className="size-3" /> AI-powered OS learning
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Understand <span className="text-gradient">CPU scheduling</span> by watching it run.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Simulate FCFS, SJF, SRTF, Round Robin and Priority scheduling with animated Gantt charts, unit-by-unit
            stepping, and an AI tutor that explains every dispatch decision.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2"><Link to="/signup"><Play className="size-4" /> Try the simulator</Link></Button>
            <Button asChild size="lg" variant="outline" className="gap-2"><Link to="/signup"><BrainCircuit className="size-4" /> Ask the AI tutor</Link></Button>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {[
              { v: 5, s: "", k: "Algorithms" },
              { v: 120, s: "+", k: "Practice questions" },
              { v: 100, s: "%", k: "Visual, step-by-step" },
            ].map((s) => (
              <div key={s.k}>
                <AnimatedCounter value={s.v} suffix={s.s} className="block text-2xl font-semibold text-foreground" />
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.k}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-scale-in">
          <img
            src={heroImage}
            width={1536}
            height={1024}
            alt="Glowing Gantt chart visualisation of CPU processes executing over time"
            className="rounded-3xl border border-border/70 shadow-2xl"
            loading="eager"
          />
          <div className="panel mt-4 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Round Robin · quantum 3</span>
              <span className="font-mono">avg wait {demo.metrics.avgWaiting.toFixed(2)}ms</span>
            </div>
            <div className="mt-3">
              <GanttChart gantt={demo.gantt} names={demoProcesses.map((p) => p.name)} runKey={1} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for the way scheduling is actually taught</h2>
          <p className="mt-3 text-muted-foreground">Lecture slides show the final Gantt chart. This shows how it got there.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="panel hover-lift p-6" style={{ animation: `fade-up 0.5s ${i * 0.06}s both` }}>
              <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                <f.icon className="size-5 text-primary" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-28">
        <div className="panel p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Five algorithms, one mental model</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ALGORITHMS.map((a) => (
              <Link
                key={a.id}
                to="/algorithms/$id"
                params={{ id: a.id }}
                className="group rounded-2xl border border-border bg-surface/60 p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
              >
                <GraduationCap className="size-4 text-accent" />
                <p className="mt-3 font-semibold tracking-tight">{a.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-32 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready for your OS exam?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start with a simulation, let the tutor quiz you, and track mastery per algorithm.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/signup">Create free account</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">Explore the dashboard</Link></Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        Process Scheduling Tutor — an interactive Operating Systems learning companion.
      </footer>
    </main>
  );
}
