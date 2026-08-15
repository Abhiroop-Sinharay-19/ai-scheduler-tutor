import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Award, Bell, GraduationCap, LogOut, Mail, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadialProgress } from "@/components/RadialProgress";
import { getProgress } from "@/lib/api";
import { student } from "@/lib/mock-data";

const progressQuery = { queryKey: ["progress"], queryFn: getProgress };

export const Route = createFileRoute("/_shell/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery),
  head: () => ({
    meta: [
      { title: "Your Profile — Process Scheduling Tutor" },
      { name: "description", content: "Manage your learning profile, achievements, notification and tutor preferences." },
      { property: "og:title", content: "Your Profile — Process Scheduling Tutor" },
      { property: "og:description", content: "Your learner profile, badges and tutor preferences." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { data } = useSuspenseQuery(progressQuery);

  return (
    <div className="space-y-8">
      <section className="panel relative overflow-hidden p-8 animate-fade-up">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-2xl text-2xl font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {student.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-3.5" /> {student.email}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="size-3.5" /> {student.course}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Level {student.level}</Badge>
              <Badge variant="outline">{student.xp} XP</Badge>
            </div>
          </div>
          <RadialProgress value={data.stats.overallProgress} size={112} label="Mastery" />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Award className="size-4 text-warning" /> Achievements</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {student.badges.map((b, i) => (
            <div
              key={b.label}
              className="rounded-2xl border border-border bg-surface/60 p-5 text-center"
              style={{ animation: `scale-in 0.4s ${i * 0.06}s both`, opacity: b.earned ? 1 : 0.45 }}
            >
              <span className="text-2xl">{b.icon}</span>
              <p className="mt-2 text-sm font-medium">{b.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.earned ? "Unlocked" : "Locked"}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Settings className="size-4 text-primary" /> Tutor preferences</h2>
          <div className="mt-5 space-y-5">
            {[
              { label: "Step-by-step explanations", desc: "Always break simulations into unit-time steps.", on: true },
              { label: "Show formulas", desc: "Display waiting/turnaround formulas with every metric.", on: true },
              { label: "Auto-suggest quizzes", desc: "Recommend a quiz after each simulation.", on: false },
            ].map((p) => (
              <div key={p.label} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Switch defaultChecked={p.on} aria-label={p.label} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Bell className="size-4 text-accent" /> Notifications</h2>
          <div className="mt-5 space-y-5">
            {[
              { label: "Daily streak reminder", desc: "A nudge if you haven't studied by 8pm.", on: true },
              { label: "Weekly progress report", desc: "Summary of mastery gains every Sunday.", on: true },
              { label: "New resources", desc: "When notes or examples are added.", on: false },
            ].map((p) => (
              <div key={p.label} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Switch defaultChecked={p.on} aria-label={p.label} />
              </div>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-8 w-full gap-2">
            <Link to="/"><LogOut className="size-4" /> Sign out</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
