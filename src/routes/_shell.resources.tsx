import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getResources } from "@/lib/api";
import { cn } from "@/lib/utils";

const resourcesQuery = { queryKey: ["resources"], queryFn: getResources };

export const Route = createFileRoute("/_shell/resources")({
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQuery),
  head: () => ({
    meta: [
      { title: "Resources — Process Scheduling Tutor" },
      { name: "description", content: "Curated OS notes, worked examples, cheat sheets and exam prep for CPU process scheduling." },
      { property: "og:title", content: "Resources — Process Scheduling Tutor" },
      { property: "og:description", content: "Notes, worked examples and exam prep for CPU process scheduling." },
    ],
  }),
  component: Resources,
});

const CATEGORIES = ["All", "OS Notes", "Process Scheduling", "Algorithms", "Examples", "Exam Preparation"] as const;

function Resources() {
  const { data } = useSuspenseQuery(resourcesQuery);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(
    () =>
      data.filter(
        (r) =>
          (category === "All" || r.category === category) &&
          (r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.description.toLowerCase().includes(query.toLowerCase())),
      ),
    [data, category, query],
  );

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Resources</h1>
        <p className="mt-2 text-muted-foreground">Short, exam-focused material — no 400-page PDFs.</p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources..."
            className="pl-9"
            aria-label="Search resources"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                category === c
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r, i) => (
            <article key={r.id} className="panel hover-lift flex flex-col p-6" style={{ animation: `fade-up 0.45s ${i * 0.05}s both` }}>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{r.type}</Badge>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" /> {r.minutes} min</span>
              </div>
              <h2 className="mt-4 text-base font-semibold tracking-tight">{r.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.description}</p>
              <span className="mt-5 flex items-center gap-2 text-xs text-primary"><BookOpen className="size-3.5" /> {r.category}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel grid place-items-center p-14 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No resources match that search</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or clear the category filter.</p>
        </div>
      )}
    </div>
  );
}
