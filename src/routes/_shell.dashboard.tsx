import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Flame,
  MessageSquareText,
  Target,
  Trophy,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { RadialProgress } from "@/components/RadialProgress";
import { Button } from "@/components/ui/button";
import { getProgress } from "@/lib/api";

const progressQuery = {
  queryKey: ["progress"],
  queryFn: getProgress,
};

export const Route = createFileRoute("/_shell/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery),
  head: () => ({
    meta: [
      { title: "Dashboard — Process Scheduling Tutor" },
      { name: "description", content: "Track your CPU scheduling mastery, streak and next topic in one AI-guided dashboard." },
      { property: "og:title", content: "Dashboard — Process Scheduling Tutor" },
      { property: "og:description", content: "Track your CPU scheduling mastery, streak and next topic in one AI-guided dashboard." },
    ],
  }),
  component: Dashboard,
});

const activityIcons: Record<string, typeof CheckCircle2> = {
  quiz: Trophy,
  problem: Cpu,
  ai: MessageSquareText,
  topic: CheckCircle2,
};

function Dashboard() {
  const { data } = useSuspenseQuery(progressQuery);
  const { stats, student, activity, algorithms, profile } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const statCards = [
    { label: "Topics Completed", value: stats.topicsCompleted, icon: CheckCircle2, suffix: "" },
    { label: "Problems Solved", value: stats.problemsSolved, icon: Target, suffix: "" },
    { label: "Quiz Accuracy", value: stats.quizAccuracy, icon: Trophy, suffix: "%" },
    { label: "Learning Streak", value: stats.streak, icon: Flame, suffix: " days" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting}, <span className="text-gradient">{student.name}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Continue learning Process Scheduling.</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4">
          <RadialProgress value={stats.overallProgress} size={104} label="Overall" />
          <div className="max-w-[150px] text-sm text-muted-foreground">
            You're ahead of your weekly plan. Keep the {stats.streak}-day streak alive.
          </div>
        </div>
      </header>

      <section className="panel relative overflow-hidden p-6 sm:p-8 animate-fade-up">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <div className="absolute -right-16 -top-24 size-72 rounded-full bg-primary/25 blur-3xl animate-pulse-glow" />
          <div className="absolute right-24 bottom-0 size-56 rounded-full bg-accent/20 blur-3xl animate-pulse-glow" />
          <svg className="absolute right-6 top-8 hidden opacity-60 lg:block" width="260" height="150">
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={10 + i * 62}
                y={54}
                width={52}
                height={40}
                rx={10}
                fill="color-mix(in oklab, var(--primary) 22%, transparent)"
                stroke="var(--border)"
                style={{ animation: `float 6s ${i * 0.4}s ease-in-out infinite` }}
              />
            ))}
            <line
              x1="10"
              y1="120"
              x2="250"
              y2="120"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeDasharray="8 8"
              className="animate-dash"
            />
          </svg>
        </div>

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground">
            <BrainCircuit className="size-3.5 text-primary" /> Continue learning
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{stats.course.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Current topic: <span className="text-foreground">{stats.course.currentTopic}</span> · {stats.course.timeRemaining}
          </p>
          <div className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${stats.course.progress}%`,
                background: "var(--gradient-primary)",
                animation: "grow-x 1.1s cubic-bezier(0.22,1,0.36,1) both",
                transformOrigin: "left",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stats.course.progress}% complete</p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/algorithms/$id" params={{ id: "rr" }}>
              Continue Learning <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, i) => (
          <div key={card.label} className="panel hover-lift p-5" style={{ animation: `fade-up 0.5s ${i * 0.08}s both` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</span>
              <card.icon className="size-4 text-primary" />
            </div>
            <AnimatedCounter value={card.value} suffix={card.suffix} className="mt-3 block text-3xl font-semibold tracking-tight" />
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel p-6 lg:col-span-3">
          <h3 className="text-lg font-semibold tracking-tight">Algorithm Mastery</h3>
          <p className="text-sm text-muted-foreground">Where you stand across the five core policies.</p>
          <div className="mt-6 space-y-5">
            {algorithms.map((a, i) => (
              <div key={a.id}>
                <div className="flex items-center justify-between text-sm">
                  <Link to="/algorithms/$id" params={{ id: a.id }} className="font-medium hover:text-primary">
                    {a.name}
                  </Link>
                  <span className="font-mono text-muted-foreground">{a.mastery}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${a.mastery}%`,
                      background: `linear-gradient(90deg, var(--chart-${(i % 5) + 1}), var(--accent))`,
                      animation: `grow-x 1s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s both`,
                      transformOrigin: "left",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
          <ol className="mt-5 space-y-5">
            {activity.map((item, i) => {
              const Icon = activityIcons[item.kind] ?? CheckCircle2;
              return (
                <li key={item.title} className="relative flex gap-4 pl-1" style={{ animation: `fade-up 0.5s ${i * 0.08}s both` }}>
                  {i < activity.length - 1 ? (
                    <span className="absolute left-[19px] top-9 h-[calc(100%-4px)] w-px bg-border" aria-hidden />
                  ) : null}
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface/70 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                    <span className="block text-[11px] text-muted-foreground/70">{item.when}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -left-10 top-0 size-56 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Your AI Learning Profile</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "Current level", v: profile.level },
                { k: "Strongest", v: profile.strongest },
                { k: "Needs practice", v: profile.needsPractice },
                { k: "Recommended next", v: profile.recommendedNext },
              ].map((item) => (
                <div key={item.k} className="rounded-xl border border-border bg-surface/60 px-4 py-3">
                  <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">{item.k}</span>
                  <span className="mt-1 block text-sm font-medium">{item.v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Learning style: {profile.learningStyle}</p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/profile">Generate Learning Plan <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
