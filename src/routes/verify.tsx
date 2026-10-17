import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendSignupOtp, verifySignupOtp } from "@/lib/supabase";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await verifySignupOtp(email, token);
      await navigate({ to: "/dashboard", replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify this email address.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await resendSignupOtp(email);
      setNotice("A new verification code has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resend the verification code.");
    } finally {
      setResending(false);
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
          to="/signup"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign up
        </Link>
        <section className="panel p-8 animate-scale-in">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Cpu className="size-5 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Verify your email</h1>
              <p className="text-xs text-muted-foreground">
                Enter the code from your Supabase confirmation email.
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(event) => void verify(event)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@student.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Verification code</Label>
              <Input
                id="token"
                name="token"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={12}
                value={token}
                onChange={(event) => setToken(event.target.value.trim())}
                placeholder="Enter the code from your email"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="rounded-md bg-success/10 p-3 text-sm text-success">
                {notice}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading || resending}>
              {loading ? "Verifying…" : "Verify email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void resend()}
              disabled={!email.trim() || loading || resending}
            >
              {resending ? "Sending…" : "Resend code"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
