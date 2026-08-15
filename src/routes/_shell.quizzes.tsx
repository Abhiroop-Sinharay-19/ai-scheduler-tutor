import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkQuizAnswer, getQuiz } from "@/lib/api";
import { quizCategories, type QuizQuestion } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export const Route = createFileRoute("/_shell/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — Process Scheduling Tutor" },
      { name: "description", content: "Gamified CPU scheduling quizzes with instant explanations and AI follow-up on every answer." },
      { property: "og:title", content: "Quizzes — Process Scheduling Tutor" },
      { property: "og:description", content: "Test FCFS, SJF, SRTF, Round Robin and Priority scheduling with instant AI feedback." },
    ],
  }),
  component: Quizzes,
});

type Phase = "select" | "playing" | "result";

interface Answered {
  correct: boolean;
  chosen: number;
  answerIndex: number;
  explanation: string;
}

function Quizzes() {
  const [phase, setPhase] = useState<Phase>("select");
  const [category, setCategory] = useState("mixed");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answered>>({});
  const [current, setCurrent] = useState<Answered | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());

  const start = async (cat: string) => {
    setCategory(cat);
    const qs = await getQuiz(cat);
    setQuestions(qs);
    setIndex(0);
    setAnswers({});
    setCurrent(null);
    setStartedAt(Date.now());
    setPhase("playing");
  };

  const question = questions[index];

  const choose = async (optionIndex: number) => {
    if (!question || current) return;
    const res = await checkQuizAnswer(question.id, optionIndex);
    const answered: Answered = { ...res, chosen: optionIndex };
    setCurrent(answered);
    setAnswers((a) => ({ ...a, [question.id]: answered }));
  };

  const next = () => {
    setCurrent(null);
    if (index + 1 >= questions.length) setPhase("result");
    else setIndex((i) => i + 1);
  };

  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const seconds = Math.round((Date.now() - startedAt) / 1000);

  if (phase === "select") {
    return (
      <div className="space-y-8">
        <header className="animate-fade-up">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Quizzes</h1>
          <p className="mt-2 text-muted-foreground">Pick a category. Every answer comes with an explanation you can push to the AI tutor.</p>
        </header>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {quizCategories.map((c, i) => (
            <button
              key={c.id}
              onClick={() => void start(c.id)}
              className="panel hover-lift p-6 text-left"
              style={{ animation: `fade-up 0.5s ${i * 0.07}s both` }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{c.label}</h2>
                <Badge variant="secondary">{c.questions} Q</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Last accuracy {c.accuracy}%</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${c.accuracy}%`, background: "var(--gradient-primary)" }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="panel relative overflow-hidden p-8 text-center animate-scale-in">
          <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
            <div className="absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl animate-pulse-glow" />
          </div>
          <div className="relative">
            <Trophy className="mx-auto size-10 text-primary" />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Quiz Complete!</h1>
            <AnimatedCounter value={score} suffix="%" className="mt-3 block text-5xl font-semibold text-gradient" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { k: "Correct answers", v: `${correctCount} / ${questions.length}`, icon: CheckCircle2 },
                { k: "Time taken", v: `${Math.floor(seconds / 60)}m ${seconds % 60}s`, icon: Clock },
                { k: "Concept mastery", v: score >= 80 ? "Strong" : score >= 60 ? "Developing" : "Needs work", icon: Sparkles },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-border bg-surface/60 px-4 py-4">
                  <m.icon className="mx-auto size-4 text-primary" />
                  <span className="mt-2 block text-[11px] uppercase tracking-wider text-muted-foreground">{m.k}</span>
                  <span className="mt-1 block text-sm font-medium">{m.v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-lg font-semibold tracking-tight">Weak areas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["SRTF preemption", "Waiting time calculations"].map((w) => (
              <Badge key={w} variant="outline" className="border-warning/50 text-warning">{w}</Badge>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setPhase("playing")} variant="outline" className="gap-2">Review mistakes</Button>
            <Button asChild variant="outline" className="gap-2"><Link to="/tutor"><Sparkles className="size-4" /> Ask AI</Link></Button>
            <Button onClick={() => void start(category)} className="gap-2"><RotateCcw className="size-4" /> Try again</Button>
          </div>
        </section>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setPhase("select")}>
          All categories
        </Button>
        <span className="text-sm text-muted-foreground">Question {index + 1} / {questions.length}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((index + (current ? 1 : 0)) / questions.length) * 100}%`, background: "var(--gradient-primary)" }}
        />
      </div>

      <section className="panel p-6 sm:p-8 animate-fade-up">
        <Badge variant="secondary" className="uppercase">{question.category}</Badge>
        <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">{question.prompt}</h1>

        <div className="mt-6 grid gap-3">
          {question.options.map((opt, i) => {
            const isChosen = current?.chosen === i;
            const isAnswer = current && current.answerIndex === i;
            return (
              <button
                key={opt}
                onClick={() => void choose(i)}
                disabled={!!current}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/60 px-5 py-4 text-left text-sm transition-all",
                  !current && "hover:-translate-y-0.5 hover:border-primary/50",
                  isAnswer && "border-success/60 bg-success/12",
                  isChosen && !current?.correct && "border-destructive/60 bg-destructive/12 animate-shake",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-lg border border-border font-mono text-xs">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
                {isAnswer ? <CheckCircle2 className="size-4 text-success" /> : null}
                {isChosen && !current?.correct ? <XCircle className="size-4 text-destructive" /> : null}
              </button>
            );
          })}
        </div>

        {current ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border p-5 animate-fade-up",
              current.correct ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10",
            )}
          >
            <p className="text-sm font-semibold">{current.correct ? "Correct!" : "Not quite."}</p>
            <p className="mt-2 text-sm text-muted-foreground">{current.explanation}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/tutor"><Sparkles className="size-3.5" /> Ask AI why</Link>
              </Button>
              <Button size="sm" onClick={next}>
                {index + 1 >= questions.length ? "See results" : "Next question"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
