import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeQuizProgress } from "../../../supabase/functions/api/quiz-progress.ts";

describe("database quiz progress calculations", () => {
  it("counts distinct published questions and uses the most recent answer per question", () => {
    const summary = summarizeQuizProgress(
      [
        { id: "q1", category: "fcfs" },
        { id: "q2", category: "fcfs" },
        { id: "q3", category: "rr" },
        { id: "q4", category: "rr" },
      ],
      [
        { question_id: "q1", is_correct: false, answered_at: "2026-10-01T10:00:00Z" },
        { question_id: "q1", is_correct: true, answered_at: "2026-10-02T10:00:00Z" },
        { question_id: "q2", is_correct: false, answered_at: "2026-10-02T11:00:00Z" },
        { question_id: "unpublished", is_correct: true, answered_at: "2026-10-03T10:00:00Z" },
      ],
    );

    assert.equal(summary.questionsCompleted, 2);
    assert.equal(summary.totalQuestions, 4);
    assert.equal(summary.progress, 50);
    assert.equal(summary.accuracy, 50);
    assert.deepEqual(summary.categories, [
      { id: "fcfs", label: "FCFS", questions: 2, completed: 2, progress: 100 },
      { id: "rr", label: "Round Robin", questions: 2, completed: 0, progress: 0 },
    ]);
  });

  it("reports an honest zero when there are no published questions or attempts", () => {
    const summary = summarizeQuizProgress([], []);
    assert.equal(summary.questionsCompleted, 0);
    assert.equal(summary.totalQuestions, 0);
    assert.equal(summary.progress, 0);
    assert.equal(summary.accuracy, 0);
    assert.deepEqual(summary.categories, []);
  });
});
