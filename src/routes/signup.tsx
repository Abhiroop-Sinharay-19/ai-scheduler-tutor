import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Process Scheduling Tutor" },
      { name: "description", content: "Create a free account to run scheduling simulations, take quizzes and learn with an AI tutor." },
      { property: "og:title", content: "Create Account — Process Scheduling Tutor" },
      { property: "og:description", content: "Start learning CPU scheduling with simulations, quizzes and an AI tutor." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 size-[38rem] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-96 rounded-full bg-primary/12 blur-3xl" />
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
              <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
              <p className="text-xs text-muted-foreground">Free while you're studying.</p>
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
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required placeholder="Abhi Sharma" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@student.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required placeholder="At least 8 characters" />
            </div>
            <Button type="submit" className="w-full" size="lg">Start learning</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
