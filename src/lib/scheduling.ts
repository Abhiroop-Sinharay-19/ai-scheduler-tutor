export type AlgorithmId = "fcfs" | "sjf" | "srtf" | "rr" | "priority";

export interface ProcessSpec {
  id: string;
  name: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface GanttSlice {
  name: string;
  start: number;
  end: number;
  idle?: boolean;
  reason: string;
}

export interface ProcessMetrics {
  name: string;
  arrival: number;
  burst: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
}

export interface TimelineStep {
  time: number;
  running: string | null;
  ready: string[];
  completed: string[];
  arrived: string[];
  note: string;
}

export interface ScheduleResult {
  algorithm: AlgorithmId;
  gantt: GanttSlice[];
  perProcess: ProcessMetrics[];
  steps: TimelineStep[];
  metrics: {
    avgWaiting: number;
    avgTurnaround: number;
    avgResponse: number;
    cpuUtilization: number;
    totalTime: number;
    throughput: number;
  };
}

export const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  fcfs: "FCFS",
  sjf: "SJF (Non-preemptive)",
  srtf: "SRTF (Preemptive SJF)",
  rr: "Round Robin",
  priority: "Priority Scheduling",
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Unit-time simulator that covers all five algorithms so the Gantt chart,
 * metrics and step-by-step timeline all come from one source of truth.
 */
export function runSchedule(
  processes: ProcessSpec[],
  algorithm: AlgorithmId,
  quantum = 2,
): ScheduleResult {
  const procs = processes
    .filter((p) => p.burst > 0)
    .map((p) => ({ ...p, remaining: p.burst, firstRun: -1, completion: -1 }))
    .sort((a, b) => a.arrival - b.arrival || a.name.localeCompare(b.name));

  const gantt: GanttSlice[] = [];
  const steps: TimelineStep[] = [];
  const completed: string[] = [];
  let queue: typeof procs = [];
  let time = procs.length ? Math.min(...procs.map((p) => p.arrival)) : 0;
  let busy = 0;
  let current: (typeof procs)[number] | null = null;
  let sliceUsed = 0;
  let guard = 0;

  const preemptive = algorithm === "srtf" || algorithm === "rr";

  const pushSlice = (name: string, reason: string, idle = false) => {
    const last = gantt[gantt.length - 1];
    if (last && last.name === name && last.end === time && last.idle === idle) {
      last.end = time + 1;
    } else {
      gantt.push({ name, start: time, end: time + 1, idle, reason });
    }
  };

  const pick = (): (typeof procs)[number] | null => {
    if (!queue.length) return null;
    const sorted = [...queue];
    if (algorithm === "sjf" || algorithm === "srtf") {
      sorted.sort(
        (a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.name.localeCompare(b.name),
      );
    } else if (algorithm === "priority") {
      sorted.sort(
        (a, b) => a.priority - b.priority || a.arrival - b.arrival || a.name.localeCompare(b.name),
      );
    }
    return sorted[0] ?? null;
  };

  const reason = (p: { name: string; remaining: number; priority: number }) => {
    switch (algorithm) {
      case "fcfs":
        return `${p.name} runs because it arrived earliest among the ready processes (FCFS is non-preemptive, so it keeps the CPU until it finishes).`;
      case "sjf":
        return `${p.name} runs because it has the shortest burst time among processes that had arrived when the CPU became free.`;
      case "srtf":
        return `${p.name} runs because it has the shortest remaining time (${p.remaining} ms) at this instant — any shorter arrival would preempt it.`;
      case "rr":
        return `${p.name} runs because it reached the front of the ready queue; it gets at most ${quantum} ms before being placed at the back.`;
      case "priority":
        return `${p.name} runs because it has the highest priority (value ${p.priority}, lower = more important) among ready processes.`;
    }
  };

  while (completed.length < procs.length && guard++ < 10000) {
    const arrived = procs.filter((p) => p.arrival === time).map((p) => p.name);
    queue.push(...procs.filter((p) => p.arrival === time && p.remaining > 0));

    if (current && preemptive) {
      if (algorithm === "rr" && sliceUsed >= quantum && current.remaining > 0) {
        queue.push(current);
        current = null;
        sliceUsed = 0;
      }
      const running = current;
      if (algorithm === "srtf" && running && running.remaining > 0) {
        const best = pick();
        if (best && best.remaining < running.remaining) {
          queue.push(running);
          current = null;
        }
      }
    }

    if (!current) {
      const next = pick();
      if (next) {
        queue = queue.filter((p) => p !== next);
        current = next;
        sliceUsed = 0;
      }
    }

    if (current) {
      if (current.firstRun < 0) current.firstRun = time;
      pushSlice(current.name, reason(current));
      steps.push({
        time,
        running: current.name,
        ready: queue.map((p) => p.name),
        completed: [...completed],
        arrived,
        note: reason(current),
      });
      current.remaining -= 1;
      sliceUsed += 1;
      busy += 1;
      if (current.remaining === 0) {
        current.completion = time + 1;
        completed.push(current.name);
        current = null;
        sliceUsed = 0;
      }
    } else {
      pushSlice("idle", "No process has arrived yet — the CPU sits idle.", true);
      steps.push({
        time,
        running: null,
        ready: [],
        completed: [...completed],
        arrived,
        note: "CPU idle: no process available in the ready queue.",
      });
    }
    time += 1;
  }

  const totalTime = time - (gantt[0]?.start ?? 0);
  const perProcess: ProcessMetrics[] = procs.map((p) => {
    const turnaround = p.completion - p.arrival;
    return {
      name: p.name,
      arrival: p.arrival,
      burst: p.burst,
      completion: p.completion,
      turnaround,
      waiting: turnaround - p.burst,
      response: p.firstRun - p.arrival,
    };
  });

  const avg = (key: keyof ProcessMetrics) =>
    perProcess.length
      ? round(perProcess.reduce((s, p) => s + (p[key] as number), 0) / perProcess.length)
      : 0;

  return {
    algorithm,
    gantt,
    perProcess,
    steps,
    metrics: {
      avgWaiting: avg("waiting"),
      avgTurnaround: avg("turnaround"),
      avgResponse: avg("response"),
      cpuUtilization: totalTime ? round((busy / totalTime) * 100) : 0,
      totalTime,
      throughput: totalTime ? round(perProcess.length / totalTime) : 0,
    },
  };
}
