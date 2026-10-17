import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkQuizAnswer, getQuiz, progressQuery, quizCategoriesQuery } from "@/lib/api";
import type { QuizQuestion } from "@/lib/mock-data";
import { getSessionUserId } from "@/lib/supabase";
import type { AlgorithmId } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export const Route = createFileRoute("/_shell/quizzes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(quizCategoriesQuery()),
  head: () => ({
    meta: [
      { title: "Quizzes — Process Scheduling Tutor" },
      {
        name: "description",
        content:
          "Gamified CPU scheduling quizzes with instant explanations and AI follow-up on every answer.",
      },
      { property: "og:title", content: "Quizzes — Process Scheduling Tutor" },
      {
        property: "og:description",
        content:
          "Test FCFS, SJF, SRTF, Round Robin and Priority scheduling with instant AI feedback.",
      },
    ],
  }),
  component: Quizzes,
});

type Phase = "select" | "playing" | "result" | "review";

interface Answered {
  correct: boolean;
  chosen: number;
  answerIndex: number;
  explanation: string;
}

function Quizzes() {
  const queryClient = useQueryClient();
  const categoriesQuery = quizCategoriesQuery();
  const { data: quizCategories } = useSuspenseQuery(categoriesQuery);
  const userId = getSessionUserId();
  const [phase, setPhase] = useState<Phase>("select");
  const [category, setCategory] = useState("mixed");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answered>>({});
  const [current, setCurrent] = useState<Answered | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const start = async (cat: string) => {
    setCategory(cat);
    setError(null);
    let qs: QuizQuestion[];
    try {
      qs = await getQuiz(cat);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load quiz questions.");
      return;
    }
    if (!qs.length) {
      setError("No quiz questions are currently available in this category.");
      return;
    }
    setQuestions(qs);
    setIndex(0);
    setReviewIndex(0);
    setAnswers({});
    setCurrent(null);
    setStartedAt(Date.now());
    setPhase("playing");
  };

  const question = questions[index];

  const choose = async (optionIndex: number) => {
    if (!question || current || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await checkQuizAnswer(question.id, optionIndex);
      const answered: Answered = { ...res, chosen: optionIndex };
      setCurrent(answered);
      setAnswers((a) => ({ ...a, [question.id]: answered }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    setCurrent(null);
    if (index + 1 >= questions.length) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quiz-categories", userId] }),
        queryClient.invalidateQueries({ queryKey: ["progress", userId] }),
      ]);
      setPhase("result");
    } else setIndex((i) => i + 1);
  };

  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

  const startReview = () => {
    setReviewIndex(0);
    setPhase("review");
  };

  if (phase === "select") {
    return (
      <div className="space-y-8">
        <header className="animate-fade-up">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Quizzes</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a category. Every answer comes with an explanation you can push to the AI tutor.
          </p>
        </header>
        {error ? <p className="panel p-4 text-sm text-destructive">{error}</p> : null}
        {quizCategories.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            No quiz questions are currently available.
          </div>
        ) : null}
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
              <p className="mt-2 text-sm text-muted-foreground">
                {c.completed} of {c.questions} questions completed
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.progress}%`, background: "var(--gradient-primary)" }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const wrongQuestions = questions.filter((q) => answers[q.id] && !answers[q.id]?.correct);
    const tutorPrompt =
      wrongQuestions.length > 0
        ? `I just finished a quiz on ${category} and made a mistake on "${wrongQuestions[0]?.prompt}". Can you explain this concept in detail?`
        : `I scored ${score}% on the ${category} quiz. Can you test me on advanced process scheduling questions?`;

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="panel relative overflow-hidden p-8 text-center animate-scale-in">
          <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
            <div className="absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl animate-pulse-glow" />
          </div>
          <div className="relative">
            <Trophy className="mx-auto size-10 text-primary" />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Quiz Complete!</h1>
            <AnimatedCounter
              value={score}
              suffix="%"
              className="mt-3 block text-5xl font-semibold text-gradient"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  k: "Correct answers",
                  v: `${correctCount} / ${questions.length}`,
                  icon: CheckCircle2,
                },
                {
                  k: "Time taken",
                  v: `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
                  icon: Clock,
                },
                {
                  k: "Concept mastery",
                  v: score >= 80 ? "Strong" : score >= 60 ? "Developing" : "Needs work",
                  icon: Sparkles,
                },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-border bg-surface/60 px-4 py-4">
                  <m.icon className="mx-auto size-4 text-primary" />
                  <span className="mt-2 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    {m.k}
                  </span>
                  <span className="mt-1 block text-sm font-medium">{m.v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-lg font-semibold tracking-tight">Key areas to practice</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["SRTF preemption", "Waiting time calculations", "Convoy effect"].map((w) => (
              <Badge key={w} variant="outline" className="border-warning/50 text-warning">
                {w}
              </Badge>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={startReview} variant="outline" className="gap-2">
              <BookOpen className="size-4" />{" "}
              {wrongQuestions.length > 0 ? "Review mistakes" : "Review answers"}
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link
                to="/tutor"
                search={{
                  prompt: tutorPrompt,
                  algorithm: category === "mixed" ? undefined : (category as AlgorithmId),
                }}
              >
                <Sparkles className="size-4" /> Ask AI
              </Link>
            </Button>
            <Button onClick={() => void start(category)} className="gap-2">
              <RotateCcw className="size-4" /> Try again
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (phase === "review") {
    const reviewQ = questions[reviewIndex];
    if (!reviewQ) return null;
    const reviewAns = answers[reviewQ.id];

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setPhase("result")}
          >
            <ChevronLeft className="size-4 mr-1" /> Back to results
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Review: Question {reviewIndex + 1} of {questions.length}
          </span>
        </div>

        <section className="panel p-6 sm:p-8 animate-fade-up">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="uppercase">
              {reviewQ.category}
            </Badge>
            {reviewAns ? (
              <Badge variant={reviewAns.correct ? "default" : "destructive"}>
                {reviewAns.correct ? "Answered Correctly" : "Incorrect"}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
            {reviewQ.prompt}
          </h1>

          <div className="mt-6 grid gap-3">
            {reviewQ.options.map((opt, i) => {
              const isChosen = reviewAns?.chosen === i;
              const isAnswer = reviewAns?.answerIndex === i;
              return (
                <div
                  key={opt}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/60 px-5 py-4 text-left text-sm",
                    isAnswer && "border-success/60 bg-success/15 font-medium text-foreground",
                    isChosen &&
                      !reviewAns?.correct &&
                      "border-destructive/60 bg-destructive/15 text-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-lg border border-border font-mono text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                  {isAnswer ? <CheckCircle2 className="size-4 text-success" /> : null}
                  {isChosen && !reviewAns?.correct ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {reviewAns ? (
            <div
              className={cn(
                "mt-6 rounded-2xl border p-5 animate-fade-up",
                reviewAns.correct
                  ? "border-success/40 bg-success/10"
                  : "border-destructive/40 bg-destructive/10",
              )}
            >
              <p className="text-sm font-semibold">
                {reviewAns.correct ? "Explanation:" : "Why this is incorrect:"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{reviewAns.explanation}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link
                    to="/tutor"
                    search={{
                      prompt: `In the quiz question: "${reviewQ.prompt}", why is "${reviewQ.options[reviewAns.answerIndex]}" the correct answer instead of "${reviewQ.options[reviewAns.chosen]}"?`,
                      algorithm:
                        reviewQ.category === "mixed"
                          ? undefined
                          : (reviewQ.category as AlgorithmId),
                    }}
                  >
                    <Sparkles className="size-3.5" /> Ask AI why
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
              disabled={reviewIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (reviewIndex + 1 >= questions.length) setPhase("result");
                else setReviewIndex((i) => i + 1);
              }}
              className="gap-1"
            >
              {reviewIndex + 1 >= questions.length ? "Done review" : "Next question"}{" "}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setPhase("select")}
        >
          All categories
        </Button>
        <span className="text-sm text-muted-foreground">
          Question {index + 1} / {questions.length}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((index + (current ? 1 : 0)) / questions.length) * 100}%`,
            background: "var(--gradient-primary)",
          }}
        />
      </div>

      <section className="panel p-6 sm:p-8 animate-fade-up">
        <Badge variant="secondary" className="uppercase">
          {question.category}
        </Badge>
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
                  isChosen &&
                    !current?.correct &&
                    "border-destructive/60 bg-destructive/12 animate-shake",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-lg border border-border font-mono text-xs">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
                {isAnswer ? <CheckCircle2 className="size-4 text-success" /> : null}
                {isChosen && !current?.correct ? (
                  <XCircle className="size-4 text-destructive" />
                ) : null}
              </button>
            );
          })}
        </div>

        {current ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border p-5 animate-fade-up",
              current.correct
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10",
            )}
          >
            <p className="text-sm font-semibold">{current.correct ? "Correct!" : "Not quite."}</p>
            <p className="mt-2 text-sm text-muted-foreground">{current.explanation}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link
                  to="/tutor"
                  search={{
                    prompt: `In the quiz question: "${question.prompt}", why is "${question.options[current.answerIndex]}" correct? ${current.explanation}`,
                    algorithm:
                      question.category === "mixed"
                        ? undefined
                        : (question.category as AlgorithmId),
                  }}
                >
                  <Sparkles className="size-3.5" /> Ask AI why
                </Link>
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
