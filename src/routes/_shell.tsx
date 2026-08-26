import { useEffect, useState } from "react";
import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/supabase";

export const Route = createFileRoute("/_shell")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!(await getSession())) throw redirect({ to: "/login" });
  },
  component: ShellLayout,
});

function ShellLayout() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void getSession().then((session) => {
      if (session) setAuthenticated(true);
      else void navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  if (!authenticated)
    return <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Checking your session…</main>;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
