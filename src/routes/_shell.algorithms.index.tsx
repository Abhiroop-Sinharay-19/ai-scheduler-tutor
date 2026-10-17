import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { progressQuery } from "@/lib/api";

export const Route = createFileRoute("/_shell/algorithms/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery()),
  head: () => ({
    meta: [
      { title: "Scheduling Algorithms — Process Scheduling Tutor" },
      {
        name: "description",
        content:
          "Compare FCFS, SJF, SRTF, Round Robin and Priority scheduling: type, complexity, difficulty and your mastery.",
      },
      { property: "og:title", content: "Scheduling Algorithms — Process Scheduling Tutor" },
      {
        property: "og:description",
        content: "Compare the five core CPU scheduling algorithms and track your mastery of each.",
      },
    ],
  }),
  component: Algorithms,
});

function Algorithms() {
  const { data } = useSuspenseQuery(progressQuery());
  const { algorithms } = data;
  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Algorithms</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Five policies, one mental model: choose a ready process, run it, measure the outcome.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {algorithms.map((a, i) => (
          <article
            key={a.id}
            className="panel hover-lift flex flex-col p-6"
            style={{ animation: `fade-up 0.5s ${i * 0.07}s both` }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{a.name}</h2>
              <Badge variant="outline" className="border-primary/40 text-primary">
                {a.type}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{a.tagline}</p>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
                <dt className="text-muted-foreground">Complexity</dt>
                <dd className="mt-0.5 font-mono">{a.complexity}</dd>
              </div>
              <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd className="mt-0.5">{a.difficulty}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="size-3.5" /> Mastery
                </span>
                <span className="font-mono">
                  {a.mastery === null ? "Not assessed" : `${a.mastery}%`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${a.mastery ?? 0}%`,
                    background: "var(--gradient-primary)",
                    animation: `grow-x 0.9s ${i * 0.08}s cubic-bezier(0.22,1,0.36,1) both`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>

            <Button asChild variant="outline" className="mt-6 gap-2">
              <Link to="/algorithms/$id" params={{ id: a.id }}>
                Learn <ArrowRight className="size-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
