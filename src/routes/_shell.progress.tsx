import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Target } from "lucide-react";
import { RadialProgress } from "@/components/RadialProgress";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { progressQuery } from "@/lib/api";

export const Route = createFileRoute("/_shell/progress")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery()),
  head: () => ({
    meta: [
      { title: "Progress Analytics — Process Scheduling Tutor" },
      {
        name: "description",
        content:
          "Visual learning analytics: mastery radar, quiz trend, study heatmap and your weakest scheduling topics.",
      },
      { property: "og:title", content: "Progress Analytics — Process Scheduling Tutor" },
      {
        property: "og:description",
        content: "See your CPU scheduling mastery, quiz trend and weak areas at a glance.",
      },
    ],
  }),
  component: Progress,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  fontSize: 12,
};

function Progress() {
  const { data } = useSuspenseQuery(progressQuery());
  const { stats, algorithms, activity, weakAreas, quizPerformance, timeSpent, heatmap } = data;
  const radar = algorithms
    .filter((algorithm) => algorithm.mastery !== null)
    .map((a) => ({ algorithm: a.name, mastery: a.mastery ?? 0 }));

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Progress</h1>
        <p className="mt-2 text-muted-foreground">Learning activity recorded in your account.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-4">
        <section className="panel flex flex-col items-center justify-center gap-3 p-6">
          {radar.length ? (
            <RadialProgress value={stats.overallProgress} size={150} label="Overall mastery" />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Algorithm mastery has not been assessed yet.
            </p>
          )}
        </section>

        <section className="panel p-6 lg:col-span-2">
          <h2 className="text-sm font-medium">Quiz performance trend</h2>
          {quizPerformance.length ? (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quizPerformance} margin={{ left: -20, right: 8, top: 6 }}>
                  <defs>
                    <linearGradient id="quizFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#quizFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {stats.totalQuestions ? "Not started" : "No quiz questions are available yet."}
            </p>
          )}
        </section>

        <section className="panel space-y-4 p-6">
          <div>
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-primary" /> Quiz completion
            </span>
            <AnimatedCounter
              value={stats.quizProgress}
              suffix="%"
              className="mt-2 block text-2xl font-semibold"
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Questions completed
            </span>
            <AnimatedCounter
              value={stats.questionsCompleted}
              className="mt-2 block text-2xl font-semibold"
            />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Quiz questions available
            </span>
            <AnimatedCounter
              value={stats.totalQuestions}
              className="mt-2 block text-2xl font-semibold"
            />
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-sm font-medium">Algorithm mastery radar</h2>
          {radar.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="algorithm"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="mastery"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.35}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No algorithm mastery records yet.</p>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="text-sm font-medium">Time spent learning</h2>
          {timeSpent.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSpent} margin={{ left: -20, right: 8, top: 6 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Study duration is not tracked yet.</p>
          )}
        </section>
      </div>

      <section className="panel p-6">
        <h2 className="text-sm font-medium">Activity calendar</h2>
        <p className="text-xs text-muted-foreground">
          Quiz answers and simulations from the last 14 weeks.
        </p>
        {activity.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
        ) : null}
        <div className="mt-5 grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2">
          {heatmap.map((cell) => (
            <span
              key={cell.day}
              title={`Intensity ${cell.intensity}`}
              className="size-3.5 shrink-0 rounded-[4px] border border-border/60"
              style={{
                background:
                  cell.intensity === 0
                    ? "color-mix(in oklab, var(--muted) 70%, transparent)"
                    : `color-mix(in oklab, var(--primary) ${cell.intensity * 22 + 12}%, transparent)`,
              }}
            />
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Target className="size-4 text-warning" /> Your weak areas
            </h2>
            <p className="text-sm text-muted-foreground">
              Areas with recorded algorithm mastery below 80%.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/quizzes">Practice these</Link>
          </Button>
        </div>
        <div className="mt-6 space-y-4">
          {weakAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessed weak areas yet.</p>
          ) : null}
          {weakAreas.map((w, i) => (
            <div key={w.topic}>
              <div className="flex items-center justify-between text-sm">
                <span>{w.topic}</span>
                <span className="font-mono text-muted-foreground">{w.score}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${w.score}%`,
                    background: "linear-gradient(90deg, var(--warning), var(--destructive))",
                    animation: `grow-x 0.9s ${i * 0.08}s cubic-bezier(0.22,1,0.36,1) both`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
