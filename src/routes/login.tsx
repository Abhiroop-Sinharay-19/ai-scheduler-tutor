import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/supabase";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    setError(null);
    setLoading(true);
    try {
      await signIn(String(values.get("email")), String(values.get("password")));
      await navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 size-[38rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-96 rounded-full bg-accent/12 blur-3xl" />
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
              <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
              <p className="text-xs text-muted-foreground">
                Pick up where your last simulation left off.
              </p>
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@student.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
