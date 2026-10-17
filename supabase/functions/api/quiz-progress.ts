export interface PublishedQuizQuestion {
  id: string;
  category: string;
}

export interface QuizAttemptRecord {
  question_id: string;
  is_correct: boolean;
  answered_at: string;
}

export function getLatestQuizAttempts(attempts: QuizAttemptRecord[]) {
  const latest = new Map<string, QuizAttemptRecord>();
  for (const attempt of [...attempts].sort((a, b) => b.answered_at.localeCompare(a.answered_at))) {
    if (!latest.has(attempt.question_id)) latest.set(attempt.question_id, attempt);
  }
  return latest;
}

export function summarizeQuizProgress(
  questions: PublishedQuizQuestion[],
  attempts: QuizAttemptRecord[],
) {
  const publishedIds = new Set(questions.map((question) => question.id));
  const latest = getLatestQuizAttempts(attempts);
  for (const questionId of latest.keys()) {
    if (!publishedIds.has(questionId)) latest.delete(questionId);
  }

  const categories = new Map<string, { questions: number; completed: number }>();
  for (const question of questions) {
    const count = categories.get(question.category) ?? { questions: 0, completed: 0 };
    count.questions++;
    if (latest.has(question.id)) count.completed++;
    categories.set(question.category, count);
  }

  const latestAttempts = [...latest.values()];
  const questionsCompleted = latest.size;
  const totalQuestions = publishedIds.size;
  return {
    questionsCompleted,
    totalQuestions,
    progress: totalQuestions ? Math.round((questionsCompleted / totalQuestions) * 100) : 0,
    accuracy: questionsCompleted
      ? Math.round(
          (latestAttempts.filter((attempt) => attempt.is_correct).length / questionsCompleted) *
            100,
        )
      : 0,
    latestAttempts,
    categories: [...categories.entries()].map(([id, count]) => ({
      id,
      label:
        id === "rr" ? "Round Robin" : id === "priority" ? "Priority Scheduling" : id.toUpperCase(),
      ...count,
      progress: count.questions ? Math.round((count.completed / count.questions) * 100) : 0,
    })),
  };
}
