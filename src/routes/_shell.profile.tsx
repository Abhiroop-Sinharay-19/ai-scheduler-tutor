import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Award, Bell, GraduationCap, LogOut, Mail, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadialProgress } from "@/components/RadialProgress";
import { progressQuery } from "@/lib/api";
import { signOut } from "@/lib/supabase";

export const Route = createFileRoute("/_shell/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery()),
  head: () => ({
    meta: [
      { title: "Your Profile — Process Scheduling Tutor" },
      {
        name: "description",
        content: "View your account details and recorded learning progress.",
      },
      { property: "og:title", content: "Your Profile — Process Scheduling Tutor" },
      {
        property: "og:description",
        content: "Your account details and recorded learning progress.",
      },
    ],
  }),
  component: Profile,
});

export function Profile() {
  const { data } = useSuspenseQuery(progressQuery());
  const currentStudent = data.student;

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = currentStudent.name
    ? currentStudent.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "S";

  return (
    <div className="space-y-8">
      <section className="panel relative overflow-hidden p-8 animate-fade-up">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-2xl text-2xl font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {currentStudent.name || "Your profile"}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {currentStudent.email || "Student account"}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="size-3.5" /> {currentStudent.course}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Level {currentStudent.level}</Badge>
            </div>
          </div>
          <RadialProgress
            value={data.stats.overallProgress}
            size={112}
            label={
              data.algorithms.some((algorithm) => algorithm.mastery !== null)
                ? "Mastery"
                : "Not assessed"
            }
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Award className="size-4 text-warning" /> Achievements
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Achievements are not currently tracked in your account.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Settings className="size-4 text-primary" /> Tutor preferences
          </h2>
          <p className="mt-5 text-sm text-muted-foreground">
            Tutor preferences are not currently saved to your account.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Bell className="size-4 text-accent" /> Notifications
          </h2>
          <p className="mt-5 text-sm text-muted-foreground">
            Notification preferences are not currently saved to your account.
          </p>
          <Button
            type="button"
            onClick={() => void handleSignOut()}
            variant="outline"
            className="mt-8 w-full gap-2"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </section>
      </div>
    </div>
  );
}
