/**
 * API service layer.
 *
 * Every screen talks to these functions only — never to mock data directly.
 * Each call first tries the real backend (FastAPI later, e.g. VITE_API_BASE_URL
 * pointing at http://localhost:8000) and transparently falls back to local
 * mock/simulation logic so the UI is fully usable today.
 */
import {
  ALGORITHM_LABELS,
  runSchedule,
  type AlgorithmId,
  type ProcessSpec,
  type ScheduleResult,
} from "./scheduling";
import {
  algorithms,
  dashboardStats,
  learningProfile,
  quizCategories,
  quizQuestions,
  quizPerformance,
  recentActivity,
  resources,
  student,
  timeSpent,
  weakAreas,
  activityHeatmap,
  type QuizQuestion,
} from "./mock-data";

const BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";

async function request<T>(path: string, init: RequestInit, fallback: () => T | Promise<T>): Promise<T> {
  if (!BASE) return fallback();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback();
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- chat ---------------------------------- */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ChatRequest {
  message: string;
  context?: {
    page?: string;
    algorithm?: AlgorithmId;
    problem?: ProcessSpec[];
    mode?: "explain" | "simplify" | "example" | "quiz";
  };
}

function mockAnswer({ message, context }: ChatRequest): string {
  const q = message.toLowerCase();
  const algo = context?.algorithm;
  const info = algorithms.find((a) => a.id === (algo ?? "")) ?? null;

  if (context?.mode === "simplify" && info) {
    return `**${info.name}, simply put**\n\n${info.aiExplanation}\n\nOne sentence to remember: ${info.tagline}`;
  }
  if (context?.mode === "example") {
    const target = info ?? algorithms[2]!;
    return `**Practice problem — ${target.name}**\n\n| Process | Arrival | Burst | Priority |\n|---|---|---|---|\n| P1 | 0 | 8 | 2 |\n| P2 | 1 | 4 | 1 |\n| P3 | 2 | 2 | 3 |\n| P4 | 3 | 1 | 2 |\n\nBuild the Gantt chart, then compute average waiting and turnaround time. Load it into the Simulator to check yourself — I'll walk through any step you get stuck on.`;
  }
  if (q.includes("preempt") || q.includes("srtf")) {
    return `SRTF always selects the process with the **shortest remaining burst time**. At each arrival the scheduler compares the newcomer's burst against the remaining time of whatever is running.\n\nSo if P1 has 5 ms left and P2 arrives needing 3 ms, P2 wins and P1 is preempted back into the ready set with its 5 ms intact. That is why you often see a process split into several Gantt blocks under SRTF.\n\nWatch for: every preemption costs a context switch, and long processes can starve.`;
  }
  if (q.includes("fcfs")) {
    return `**FCFS** runs processes strictly in arrival order using a FIFO ready queue, and never preempts.\n\nBecause of that, one long burst at the head delays every short job behind it — the **convoy effect**. It's simple and starvation-free, but the average waiting time is usually the worst of the five algorithms.`;
  }
  if (q.includes("round robin") || q.includes("quantum")) {
    return `**Round Robin** gives each process a fixed time quantum *q*, then rotates it to the tail of the ready queue.\n\n- Small *q* → excellent response time, but lots of context switches.\n- Large *q* → behaves like FCFS.\n\nA good rule of thumb: 80% of CPU bursts should be shorter than the quantum.`;
  }
  if (q.includes("sjf") || q.includes("waiting time")) {
    return `**SJF minimises average waiting time** by an exchange argument: if a longer job runs before a shorter one, swapping them reduces total waiting time. Repeating the swap gives shortest-first order.\n\nRemember the formulas:\n- Turnaround = Completion − Arrival\n- Waiting = Turnaround − Burst\n- Response = First CPU time − Arrival`;
  }
  if (q.includes("test me") || q.includes("quiz")) {
    return `Let's test you. **Which algorithm can cause starvation, and what fixes it?**\n\nA. FCFS · B. Round Robin · C. Priority scheduling · D. None\n\nReply with a letter and I'll tell you exactly where your reasoning holds or breaks.`;
  }
  if (context?.problem?.length) {
    const result = runSchedule(context.problem, algo ?? "fcfs", 2);
    return `For the attached problem under **${ALGORITHM_LABELS[algo ?? "fcfs"]}**:\n\n- Average waiting time: **${result.metrics.avgWaiting} ms**\n- Average turnaround time: **${result.metrics.avgTurnaround} ms**\n- CPU utilisation: **${result.metrics.cpuUtilization}%**\n\nThe first block is ${result.gantt[0]?.name}: ${result.gantt[0]?.reason}`;
  }
  return `Good question. Let's anchor it in the fundamentals of CPU scheduling.\n\nThe scheduler picks one ready process at a time using a selection rule (arrival order, shortest burst, remaining time, quantum rotation, or priority). Every metric you compute — waiting, turnaround, response — falls out of the resulting Gantt chart.\n\nTell me which algorithm you're working on, or attach a process table, and I'll walk through it time unit by time unit.`;
}

export async function postChat(body: ChatRequest): Promise<{ reply: string }> {
  return request(
    "/api/chat",
    { method: "POST", body: JSON.stringify(body) },
    async () => {
      await delay(500);
      return { reply: mockAnswer(body) };
    },
  );
}

/* ----------------------------- scheduling ------------------------------ */

export interface ScheduleRequest {
  algorithm: AlgorithmId;
  quantum?: number;
  processes: ProcessSpec[];
}

export async function postSchedule(body: ScheduleRequest): Promise<ScheduleResult> {
  return request(
    "/api/schedule",
    { method: "POST", body: JSON.stringify(body) },
    async () => {
      await delay(280);
      return runSchedule(body.processes, body.algorithm, body.quantum ?? 2);
    },
  );
}

/* -------------------------------- quiz --------------------------------- */

export async function getQuiz(category: string): Promise<QuizQuestion[]> {
  return request(`/api/quiz?category=${category}`, { method: "GET" }, async () => {
    await delay(200);
    const pool =
      category === "mixed" ? quizQuestions : quizQuestions.filter((q) => q.category === category);
    const list = pool.length >= 5 ? pool : quizQuestions;
    return list.slice(0, 10);
  });
}

export async function checkQuizAnswer(
  questionId: string,
  optionIndex: number,
): Promise<{ correct: boolean; explanation: string; answerIndex: number }> {
  return request(
    "/api/quiz/check",
    { method: "POST", body: JSON.stringify({ questionId, optionIndex }) },
    async () => {
      const q = quizQuestions.find((item) => item.id === questionId);
      if (!q) return { correct: false, explanation: "Question not found.", answerIndex: 0 };
      return {
        correct: q.answerIndex === optionIndex,
        explanation: q.explanation,
        answerIndex: q.answerIndex,
      };
    },
  );
}

export async function getQuizCategories() {
  return request("/api/quiz/categories", { method: "GET" }, () => quizCategories);
}

/* ------------------------------ progress ------------------------------- */

export interface ProgressPayload {
  student: typeof student;
  stats: typeof dashboardStats;
  algorithms: typeof algorithms;
  activity: typeof recentActivity;
  profile: typeof learningProfile;
  weakAreas: typeof weakAreas;
  quizPerformance: typeof quizPerformance;
  timeSpent: typeof timeSpent;
  heatmap: typeof activityHeatmap;
}

export async function getProgress(): Promise<ProgressPayload> {
  return request("/api/progress", { method: "GET" }, () => ({
    student,
    stats: dashboardStats,
    algorithms,
    activity: recentActivity,
    profile: learningProfile,
    weakAreas,
    quizPerformance,
    timeSpent,
    heatmap: activityHeatmap,
  }));
}

export async function getAlgorithms() {
  return request("/api/algorithms", { method: "GET" }, () => algorithms);
}

export async function getResources() {
  return request("/api/resources", { method: "GET" }, () => resources);
}
