import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const password = String(data.get("password"));
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== String(data.get("confirmPassword"))) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const session = await signUp(String(data.get("email")), password, {
        fullName: String(data.get("name")).trim(),
        level: String(data.get("level")) as "Beginner" | "Intermediate" | "Advanced",
        institution: String(data.get("institution")).trim(),
        studyYear: String(data.get("studyYear")),
        learningGoal: String(data.get("learningGoal")),
      });
      if (session?.access_token) await navigate({ to: "/dashboard" });
      else await navigate({ to: "/verify", search: { email: String(data.get("email")) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 size-[38rem] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-96 rounded-full bg-primary/12 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back home
        </Link>
        <div className="panel p-8 animate-scale-in">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Cpu className="size-5 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
              <p className="text-xs text-muted-foreground">Free while you're studying.</p>
            </div>
          </div>
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@student.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Current OS level</Label>
              <select
                id="level"
                name="level"
                required
                defaultValue="Beginner"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">
                Institution <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="institution"
                name="institution"
                maxLength={120}
                placeholder="University or school"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studyYear">Study year</Label>
                <select
                  id="studyYear"
                  name="studyYear"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Prefer not to say</option>
                  <option>First year</option>
                  <option>Second year</option>
                  <option>Third year</option>
                  <option>Fourth year</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="learningGoal">Primary goal</Label>
                <select
                  id="learningGoal"
                  name="learningGoal"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose later</option>
                  <option>Understand concepts</option>
                  <option>Prepare for exams</option>
                  <option>Practice problems</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Re-enter your password"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            ) : null}
            {notice ? (
              <p className="rounded-md bg-success/10 p-3 text-sm text-success">{notice}</p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account…" : "Start learning"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
