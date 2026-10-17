import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getAuthenticatedUser } from "@/lib/supabase";

export const Route = createFileRoute("/_shell")({
  // Authentication is stored in browser localStorage, so protected route
  // loaders must not run during server rendering without the user's session.
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    if (!user) throw redirect({ to: "/login" });
  },
  pendingComponent: SessionLoading,
  component: ShellLayout,
});

function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Checking your session…
    </main>
  );
}

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
