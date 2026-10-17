import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runSchedule, type ProcessSpec } from "../scheduling.ts";

describe("CPU Scheduling Algorithms", () => {
  describe("First-Come, First-Served (FCFS)", () => {
    it("correctly schedules standard processes in arrival order", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 4, priority: 1 },
        { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 1 },
        { id: "p3", name: "P3", arrival: 2, burst: 1, priority: 1 },
      ];

      const result = runSchedule(processes, "fcfs");

      assert.equal(result.algorithm, "fcfs");
      assert.equal(result.gantt.length, 3);
      assert.deepEqual(
        result.gantt.map((g) => g.name),
        ["P1", "P2", "P3"],
      );
      assert.deepEqual(
        result.gantt.map((g) => [g.start, g.end]),
        [
          [0, 4],
          [4, 7],
          [7, 8],
        ],
      );

      const p1 = result.perProcess.find((p) => p.name === "P1")!;
      assert.equal(p1.completion, 4);
      assert.equal(p1.waiting, 0);
      assert.equal(p1.turnaround, 4);

      const p2 = result.perProcess.find((p) => p.name === "P2")!;
      assert.equal(p2.completion, 7);
      assert.equal(p2.waiting, 3);
      assert.equal(p2.turnaround, 6);

      const p3 = result.perProcess.find((p) => p.name === "P3")!;
      assert.equal(p3.completion, 8);
      assert.equal(p3.waiting, 5);
      assert.equal(p3.turnaround, 6);

      assert.equal(result.metrics.avgWaiting, 2.67);
      assert.equal(result.metrics.avgTurnaround, 5.33);
      assert.equal(result.metrics.totalTime, 8);
    });

    it("handles CPU idle periods between arrivals", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 2, burst: 3, priority: 1 },
        { id: "p2", name: "P2", arrival: 7, burst: 2, priority: 1 },
      ];

      const result = runSchedule(processes, "fcfs");

      assert.equal(result.gantt[0]?.idle, true);
      assert.equal(result.gantt[0]?.name, "idle");
      assert.equal(result.gantt[0]?.start, 0);
      assert.equal(result.gantt[0]?.end, 2);

      assert.equal(result.gantt[1]?.name, "P1");
      assert.equal(result.gantt[1]?.start, 2);
      assert.equal(result.gantt[1]?.end, 5);

      assert.equal(result.gantt[2]?.idle, true);
      assert.equal(result.gantt[2]?.start, 5);
      assert.equal(result.gantt[2]?.end, 7);

      assert.equal(result.gantt[3]?.name, "P2");
      assert.equal(result.gantt[3]?.start, 7);
      assert.equal(result.gantt[3]?.end, 9);
    });
  });

  describe("Shortest Job First (SJF - Non-preemptive)", () => {
    it("picks the shortest job once CPU becomes available without preempting running job", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 7, priority: 1 },
        { id: "p2", name: "P2", arrival: 2, burst: 4, priority: 1 },
        { id: "p3", name: "P3", arrival: 4, burst: 1, priority: 1 },
        { id: "p4", name: "P4", arrival: 5, burst: 4, priority: 1 },
      ];

      const result = runSchedule(processes, "sjf");

      assert.deepEqual(
        result.gantt.map((g) => g.name),
        ["P1", "P3", "P2", "P4"],
      );
      assert.deepEqual(
        result.gantt.map((g) => [g.start, g.end]),
        [
          [0, 7],
          [7, 8],
          [8, 12],
          [12, 16],
        ],
      );
    });
  });

  describe("Shortest Remaining Time First (SRTF - Preemptive)", () => {
    it("preempts a running process when a newly arrived process has shorter remaining time", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 8, priority: 1 },
        { id: "p2", name: "P2", arrival: 1, burst: 4, priority: 1 },
        { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 1 },
        { id: "p4", name: "P4", arrival: 3, burst: 1, priority: 1 },
      ];

      const result = runSchedule(processes, "srtf");

      assert.deepEqual(
        result.gantt.map((g) => g.name),
        ["P1", "P2", "P3", "P4", "P2", "P1"],
      );
      assert.deepEqual(
        result.gantt.map((g) => [g.start, g.end]),
        [
          [0, 1],
          [1, 2],
          [2, 4],
          [4, 5],
          [5, 8],
          [8, 15],
        ],
      );
    });
  });

  describe("Round Robin (RR)", () => {
    it("cycles processes within given time quantum and rotates queue", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 1 },
        { id: "p2", name: "P2", arrival: 0, burst: 3, priority: 1 },
        { id: "p3", name: "P3", arrival: 0, burst: 1, priority: 1 },
      ];

      const result = runSchedule(processes, "rr", 2);

      assert.deepEqual(
        result.gantt.map((g) => g.name),
        ["P1", "P2", "P3", "P1", "P2", "P1"],
      );
      assert.deepEqual(
        result.gantt.map((g) => [g.start, g.end]),
        [
          [0, 2],
          [2, 4],
          [4, 5],
          [5, 7],
          [7, 8],
          [8, 9],
        ],
      );
    });
  });

  describe("Priority Scheduling (Non-preemptive)", () => {
    it("executes ready processes in order of highest priority (lowest numeric value)", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 4, priority: 3 },
        { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 1 },
        { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 2 },
      ];

      const result = runSchedule(processes, "priority");

      assert.deepEqual(
        result.gantt.map((g) => g.name),
        ["P1", "P2", "P3"],
      );
      assert.deepEqual(
        result.gantt.map((g) => [g.start, g.end]),
        [
          [0, 4],
          [4, 7],
          [7, 9],
        ],
      );
    });
  });

  describe("Edge Cases", () => {
    it("gracefully handles an empty process list", () => {
      const result = runSchedule([], "fcfs");
      assert.equal(result.gantt.length, 0);
      assert.equal(result.perProcess.length, 0);
      assert.equal(result.steps.length, 0);
      assert.equal(result.metrics.totalTime, 0);
    });

    it("filters out zero and negative burst time processes", () => {
      const processes: ProcessSpec[] = [
        { id: "p1", name: "P1", arrival: 0, burst: 3, priority: 1 },
        { id: "p2", name: "P2", arrival: 0, burst: 0, priority: 1 },
        { id: "p3", name: "P3", arrival: 0, burst: -2, priority: 1 },
      ];

      const result = runSchedule(processes, "fcfs");
      assert.equal(result.perProcess.length, 1);
      assert.equal(result.perProcess[0]?.name, "P1");
      assert.equal(result.metrics.totalTime, 3);
    });
  });
});
