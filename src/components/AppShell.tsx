import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Cpu,
  LayoutDashboard,
  Library,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { student } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { GlobalAssistant } from "./GlobalAssistant";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tutor", label: "AI Tutor", icon: Sparkles },
  { to: "/simulator", label: "Simulator", icon: Cpu },
  { to: "/algorithms", label: "Algorithms", icon: Boxes },
  { to: "/quizzes", label: "Quizzes", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/resources", label: "Resources", icon: Library },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon className={cn("size-4.5 transition-transform group-hover:scale-110", active && "text-primary")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-2">
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-3 py-2.5 transition-colors hover:border-primary/40"
      >
        <span
          className="grid size-9 place-items-center rounded-lg text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          {student.name.slice(0, 1)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{student.name}</span>
          <span className="block text-xs text-muted-foreground">{student.level} level</span>
        </span>
      </Link>
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="size-4" /> Settings
      </Link>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar/80 px-4 py-6 backdrop-blur lg:flex">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-2.5 px-2">
            <span
              className="grid size-9 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Cpu className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Scheduling Tutor</span>
              <span className="block text-[11px] text-muted-foreground">AI-powered OS learning</span>
            </span>
          </Link>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span
            className="grid size-8 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cpu className="size-4" />
          </span>
          <span className="text-sm font-semibold">Scheduling Tutor</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="grid size-9 place-items-center rounded-lg border border-border"
        >
          <Menu className="size-4" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 flex w-72 flex-col justify-between border-l border-border bg-sidebar px-4 py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-semibold">Menu</span>
                <button onClick={() => setOpen(false)} aria-label="Close navigation">
                  <X className="size-4" />
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter />
          </div>
        </div>
      ) : null}

      <main className="px-4 pb-24 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-16">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      <GlobalAssistant />
    </div>
  );
}
