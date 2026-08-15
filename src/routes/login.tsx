import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Process Scheduling Tutor" },
      { name: "description", content: "Sign in to continue your CPU scheduling course, simulations and AI tutoring sessions." },
      { property: "og:title", content: "Sign In — Process Scheduling Tutor" },
      { property: "og:description", content: "Continue your CPU scheduling course and AI tutoring sessions." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 size-[38rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-96 rounded-full bg-accent/12 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Back home
        </Link>

        <div className="panel p-8 animate-scale-in">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="size-5 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
              <p className="text-xs text-muted-foreground">Pick up where your last simulation left off.</p>
            </div>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@student.edu" defaultValue="abhi@student.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required placeholder="••••••••" defaultValue="scheduling" />
            </div>
            <Button type="submit" className="w-full" size="lg">Sign in</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-primary underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
