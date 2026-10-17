import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  postSchedule,
  getQuiz,
  checkQuizAnswer,
  getQuizCategories,
  getAlgorithms,
  getResources,
  getProgress,
  postChat,
  generateLocalTutorReply,
} from "../api.ts";
import type { ProcessSpec } from "../scheduling.ts";

describe("API Client & Offline Domain Engine", () => {
  describe("postSchedule", () => {
    it("runs scheduling simulation and calculates accurate Gantt and metrics", async () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 3, priority: 1 },
        { id: "p2", name: "P2", arrival: 1, burst: 2, priority: 1 },
      ];

      const res = await postSchedule({ algorithm: "fcfs", quantum: 2, processes });
      assert.equal(res.algorithm, "fcfs");
      assert.equal(res.perProcess.length, 2);
      assert.equal(res.metrics.totalTime, 5);
      assert.equal(res.gantt.length, 2);
    });
  });

  describe("Quiz & Categories", () => {
    it("does not substitute fake questions or categories when the database API is unavailable", async () => {
      await assert.rejects(() => getQuiz("fcfs"), /API is not configured/);
      await assert.rejects(() => getQuizCategories(), /API is not configured/);
      await assert.rejects(() => checkQuizAnswer("question-id", 0), /API is not configured/);
    });
  });

  describe("Curriculum Resources, Algorithms & Student Progress", () => {
    it("retrieves curated learning resources", async () => {
      const resources = await getResources();
      assert.ok(resources.length > 0);
      assert.ok(resources[0]?.title);
      assert.ok(resources[0]?.category);
    });

    it("retrieves algorithm descriptions and exam questions", async () => {
      const algos = await getAlgorithms();
      assert.equal(algos.length, 5);
      assert.ok(algos.some((a) => a.id === "srtf"));
      assert.ok(algos.some((a) => a.id === "fcfs"));
    });

    it("does not present a local mock as database-backed student progress", async () => {
      await assert.rejects(() => getProgress(), /API is not configured/);
    });
  });

  describe("Local AI Scheduling Tutor Engine (generateLocalTutorReply)", () => {
    it("explains algorithms in detail", () => {
      const reply = generateLocalTutorReply("Can you explain how SRTF works?", {
        algorithm: "srtf",
      });
      assert.ok(reply.includes("SRTF"));
      assert.ok(reply.toLowerCase().includes("preemptive"));
    });

    it("provides real-world analogies", () => {
      const reply = generateLocalTutorReply("Give me a real-world analogy for Round Robin", {
        algorithm: "rr",
      });
      assert.ok(reply.includes("Round Robin"));
      assert.ok(reply.toLowerCase().includes("quantum"));
    });

    it("generates practice problems with solutions", () => {
      const reply = generateLocalTutorReply("Give me a practice problem for SJF", {
        algorithm: "sjf",
      });
      assert.ok(reply.includes("Practice Problem"));
      assert.ok(reply.includes("Gantt Chart Solution"));
    });

    it("breaks down formulas for Turnaround and Waiting times", () => {
      const reply = generateLocalTutorReply("What is the formula for waiting time?", {});
      assert.ok(reply.includes("Turnaround Time"));
      assert.ok(reply.includes("Waiting Time"));
      assert.ok(reply.includes("TAT - Burst Time"));
    });

    it("walks through an attached active problem", () => {
      const problem: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 4, priority: 1 },
        { id: "p2", name: "P2", arrival: 1, burst: 2, priority: 1 },
      ];
      const reply = generateLocalTutorReply("Walk me through this problem", {
        algorithm: "fcfs",
        problem,
      });
      assert.ok(reply.includes("Walkthrough"));
      assert.ok(reply.includes("P1"));
      assert.ok(reply.includes("P2"));
    });

    it("does not replace a missing AI backend with a fabricated local answer", async () => {
      await assert.rejects(
        () => postChat({ message: "Explain FCFS convoy effect", context: { algorithm: "fcfs" } }),
        /API is not configured/,
      );
    });
  });
});
