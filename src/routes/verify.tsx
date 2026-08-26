import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySignupOtp } from "@/lib/supabase";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>) => ({ email: typeof search.email === "string" ? search.email : "" }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setError(null);
    setLoading(true);
    try {
      await verifySignupOtp(String(data.get("email")).trim(), String(data.get("token")).trim());
      await navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That code could not be verified.");
    } finally {
      setLoading(false);
    }
  };
  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
    <div className="relative w-full max-w-md">
      <Link to="/signup" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to sign up</Link>
      <div className="panel p-8 animate-scale-in">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}><Cpu className="size-5" /></span><div><h1 className="text-lg font-semibold">Verify your email</h1><p className="text-xs text-muted-foreground">Enter the one-time code from your email.</p></div></div>
        <form className="mt-8 space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required defaultValue={email} /></div>
          <div className="space-y-2"><Label htmlFor="token">Verification code</Label><Input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" required placeholder="Enter the code" /></div>
          {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? "Verifying…" : "Verify account"}</Button>
        </form>
      </div>
    </div>
  </main>;
}
