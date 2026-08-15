import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AIChat } from "./AIChat";
import { cn } from "@/lib/utils";
import type { AlgorithmId } from "@/lib/scheduling";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "your dashboard",
  "/tutor": "the AI tutor",
  "/simulator": "the scheduling simulator",
  "/algorithms": "the algorithms library",
  "/quizzes": "the quiz section",
  "/progress": "your progress analytics",
  "/resources": "the resource library",
  "/profile": "your learning profile",
};

function algorithmFromPath(path: string): AlgorithmId | undefined {
  const match = path.match(/\/algorithms\/(fcfs|sjf|srtf|rr|priority)/);
  return (match?.[1] as AlgorithmId | undefined) ?? undefined;
}

export function GlobalAssistant() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const algorithm = algorithmFromPath(pathname);
  const label = PAGE_LABELS[pathname] ?? "this page";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
        className={cn(
          "fixed bottom-20 right-5 z-50 grid size-14 place-items-center rounded-2xl border border-border text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6",
        )}
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </button>

      {open ? (
        <div className="animate-scale-in glass fixed bottom-36 right-4 z-50 flex h-[min(560px,72vh)] w-[min(400px,calc(100vw-2rem))] flex-col rounded-3xl p-4 md:bottom-24">
          <div className="mb-2">
            <p className="text-sm font-semibold">Need help?</p>
            <p className="text-xs text-muted-foreground">
              I can see you're on {label}
              {algorithm ? ` (${algorithm.toUpperCase()})` : ""}.
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <AIChat
              compact
              context={{ page: pathname, ...(algorithm ? { algorithm } : {}) }}
              quickPrompts={["Explain this", "Solve this", "Give me a hint", "Another example"]}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
