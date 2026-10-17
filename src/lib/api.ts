/**
 * API service layer.
 *
 * Screens use this service layer for backend data. Scheduling calculations
 * can run locally when the API is unavailable; static algorithm and resource
 * catalogs are fallback content. Chat, quizzes, and user progress require the
 * configured Supabase API and surface request errors to the UI.
 */
import {
  runSchedule,
  type AlgorithmId,
  type ProcessSpec,
  type ScheduleResult,
  ALGORITHM_LABELS,
} from "./scheduling.ts";
import {
  algorithms,
  resources,
  type QuizQuestion,
  type QuizCategory,
  type Resource,
  type AlgorithmInfo,
} from "./mock-data.ts";
import { getAccessToken, getSessionUserId, signOut } from "./supabase.ts";

const env: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};
const API_BASE = (env["VITE_API_BASE_URL"] as string | undefined) ?? "";
const SUPABASE_URL = env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_ANON_KEY = env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

function endpoint(path: string): string | null {
  if (API_BASE) return `${API_BASE}${path}`;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const [route, query = ""] = path.replace(/^\/api/, "").split("?");
    const target = new URL(`${SUPABASE_URL}/functions/v1/api`);
    target.searchParams.set("route", route ?? "");
    if (query) {
      new URLSearchParams(query).forEach((value, key) => target.searchParams.set(key, value));
    }
    return target.toString();
  }
  return null;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const target = endpoint(path);
  if (!target) throw new Error("API is not configured.");
  const token = await getAccessToken();
  const res = await fetch(target, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && token) {
    void signOut().catch((error: unknown) => {
      console.error("Unable to clear the expired Supabase session:", error);
    });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/* ------------------------------- chat ---------------------------------- */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: Array<Pick<ChatMessage, "role" | "content">>;
  context?: {
    page?: string;
    algorithm?: AlgorithmId;
    problem?: ProcessSpec[];
    mode?: "explain" | "simplify" | "example" | "quiz";
  };
}

export async function postChat(body: ChatRequest): Promise<{
  reply: string;
  sessionId: string;
}> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function generateLocalTutorReply(
  reqOrMessage: ChatRequest | string,
  context?: ChatRequest["context"],
): string {
  const req: ChatRequest =
    typeof reqOrMessage === "string"
      ? { message: reqOrMessage, ...(context !== undefined ? { context } : {}) }
      : reqOrMessage;
  const msg = req.message.toLowerCase();
  const mode = req.context?.mode;
  const algo =
    req.context?.algorithm ??
    (msg.includes("srtf")
      ? "srtf"
      : msg.includes("sjf")
        ? "sjf"
        : msg.includes("round robin") || msg.includes("rr")
          ? "rr"
          : msg.includes("priority")
            ? "priority"
            : msg.includes("fcfs")
              ? "fcfs"
              : undefined);

  // 1. Attached problem walkthrough takes top priority
  if (req.context?.problem && req.context.problem.length > 0) {
    const sim = runSchedule(req.context.problem, algo ?? "fcfs", 2);
    const ganttStr = sim.gantt.map((g) => `${g.name} (${g.start}-${g.end}ms)`).join(" → ");
    return `### Walkthrough for your attached problem (${ALGORITHM_LABELS[sim.algorithm]}):\n\n**Execution Order:**\n${ganttStr}\n\n**Results Summary:**\n- **Average Waiting Time:** \`${sim.metrics.avgWaiting} ms\`\n- **Average Turnaround Time:** \`${sim.metrics.avgTurnaround} ms\`\n- **Average Response Time:** \`${sim.metrics.avgResponse} ms\`\n- **CPU Utilization:** \`${sim.metrics.cpuUtilization}%\`\n\n**Core Decision:**\n${sim.gantt[0]?.reason ?? "First ready process dispatched."}`;
  }

  // 2. Formulas and calculations
  if (
    msg.includes("formula") ||
    msg.includes("calculate") ||
    (msg.includes("waiting") && msg.includes("time") && !msg.includes("minimize")) ||
    msg.includes("turnaround") ||
    msg.includes("response time")
  ) {
    return "### Core CPU Scheduling Formulas:\n\n1. **Turnaround Time (TAT)** = Completion Time (CT) − Arrival Time (AT)\n   *(Total time elapsed from submission to completion)*\n\n2. **Waiting Time (WT)** = Turnaround Time (TAT) − Burst Time (BT)\n   *(Total time spent idle in the ready queue: TAT - Burst Time)*\n\n3. **Response Time (RT)** = First Execution Time − Arrival Time (AT)\n   *(Time until the process first gets the CPU)*\n\n4. **CPU Utilization** = `(Busy Time / Total Time) × 100%`\n\n5. **Throughput** = `Total Completed Processes / Total Elapsed Time`";
  }

  // 3. Analogies and intuitive simplifications
  if (
    mode === "simplify" ||
    msg.includes("simplify") ||
    msg.includes("analogy") ||
    msg.includes("real-world") ||
    msg.includes("simple terms")
  ) {
    if (algo === "fcfs") {
      return "**FCFS in simple terms (Supermarket Checkout):**\n\nImagine a single line at the grocery store. Whoever gets in line first gets served first. If someone ahead of you has a cart full of 100 items while you only have 1 item, you have to wait for them to finish completely. That delay is the **convoy effect**.";
    }
    if (algo === "sjf" || algo === "srtf") {
      return `**${algo.toUpperCase()} in simple terms (Triage Nurse):**\n\nImagine an emergency room where patients with quick 2-minute checkups are seen before patients needing 2-hour surgeries. By clearing out all the quick cases first, the total time people spend waiting in the lobby drops dramatically. In **SRTF**, if a 1-minute case walks in while a 5-minute case is halfway through, the doctor pauses to quickly treat the 1-minute patient first.`;
    }
    if (algo === "rr") {
      return "**Round Robin in simple terms (Classroom Presentations):**\n\nInstead of letting one student present for 30 minutes while everyone falls asleep, each student gets a strict **2-minute timer** (the time quantum). When the timer rings, you pause your presentation and go to the back of the line. Everyone gets regular turns and nobody is ignored.";
    }
    if (algo === "priority") {
      return "**Priority Scheduling in simple terms (VIP Boarding):**\n\nBoarding an airplane where first-class passengers (high priority) always board before economy passengers regardless of who arrived at the gate first. To prevent economy passengers from waiting forever (**starvation**), the airline might upgrade passengers who have waited over 3 hours (**aging**).";
    }
    return "**CPU Scheduling in simple terms:**\n\nThe CPU is like a single chef in a busy kitchen. CPU Scheduling is the rulebook the chef uses to decide which customer's dish to work on next when 10 orders are waiting at the same time.";
  }

  // 4. Practice problem generation
  if (
    mode === "example" ||
    msg.includes("example") ||
    msg.includes("problem") ||
    msg.includes("practice") ||
    msg.includes("test me")
  ) {
    const targetAlgo = algo ?? "rr";
    const sampleProcs: ProcessSpec[] = [
      { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 2 },
      { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 1 },
      { id: "p3", name: "P3", arrival: 2, burst: 1, priority: 3 },
    ];
    const sim = runSchedule(sampleProcs, targetAlgo, 2);
    const ganttStr = sim.gantt.map((g) => `[${g.start} ${g.name} ${g.end}]`).join(" → ");

    return `### Practice Problem: ${ALGORITHM_LABELS[targetAlgo]}\n\n**Given Process Table:**\n| Process | Arrival Time | Burst Time | Priority |\n|---|---|---|---|\n| P1 | 0 ms | 5 ms | 2 |\n| P2 | 1 ms | 3 ms | 1 |\n| P3 | 2 ms | 1 ms | 3 |\n\n**Gantt Chart Solution:**\n${ganttStr}\n\n**Calculated Metrics:**\n- **Average Waiting Time:** \`${sim.metrics.avgWaiting} ms\`\n- **Average Turnaround Time:** \`${sim.metrics.avgTurnaround} ms\`\n- **CPU Utilization:** \`${sim.metrics.cpuUtilization}%\`\n\nTry entering these numbers into the **Simulator** to step through the CPU ready queue!`;
  }

  // 5. Specific scheduling concepts
  if (msg.includes("preempt") || (msg.includes("why") && msg.includes("srtf"))) {
    return "**Why SRTF Preempts a Running Process:**\n\nIn **Shortest Remaining Time First (SRTF)**, the scheduler re-evaluates the ready queue at every new process arrival.\n\n- If a newly arrived process has a burst time **strictly less** than the currently executing process's remaining time, the running process is stopped and placed back into the ready queue.\n- This guarantees that the process with the smallest amount of work left to do always holds the CPU, which mathematically minimizes the average waiting time.\n- **Trade-off:** Frequent preemptions cause more context switches and CPU cache invalidations.";
  }

  if (msg.includes("convoy") || (msg.includes("fcfs") && msg.includes("slow"))) {
    return "**The Convoy Effect in FCFS:**\n\nThe Convoy Effect occurs when a CPU-bound process with a huge burst time arrives first, forcing multiple short I/O-bound processes to wait behind it.\n\n- Because **FCFS is non-preemptive**, the CPU cannot switch away to let the quick jobs finish.\n- Result: Substantially higher average waiting times and poor device utilization (I/O devices sit idle while waiting for the CPU-bound job).";
  }

  if (msg.includes("starvation") || msg.includes("aging")) {
    return "**Starvation & The Aging Solution:**\n\n- **Starvation (Indefinite Blocking):** In Priority Scheduling and SJF/SRTF, low-priority or long-burst jobs may wait indefinitely if a continuous stream of higher-priority or shorter jobs keeps arriving.\n- **Aging:** The standard solution. The operating system gradually increases the priority (or decreases effective remaining time) of processes that have spent a long time waiting in the ready queue, ensuring every process eventually executes.";
  }

  // 6. Algorithm overview
  if (algo) {
    const info = algorithms.find((a) => a.id === algo);
    if (info) {
      return `### ${info.name} Scheduling\n\n${info.overview}\n\n**How It Operates:**\n${info.howItWorks.map((h) => `- ${h}`).join("\n")}\n\n**Advantages:**\n${info.advantages.map((a) => `- ${a}`).join("\n")}\n\n**Disadvantages:**\n${info.disadvantages.map((d) => `- ${d}`).join("\n")}\n\n**AI Insight:** ${info.aiExplanation}`;
    }
  }

  return `I'm your CPU Scheduling Tutor! Here are key areas you can ask me about:\n\n- **Algorithms:** Ask "Explain FCFS", "How does SJF work?", "Why does SRTF minimize waiting?", or "How to tune Round Robin quantum?"\n- **Formulas:** Ask "What is the formula for turnaround and waiting time?"\n- **Troubleshooting:** Attach a process table or ask "Why does preemption happen here?"\n- **Practice:** Ask "Give me a Round Robin practice problem."`;
}

/* ----------------------------- scheduling ------------------------------ */

export interface ScheduleRequest {
  algorithm: AlgorithmId;
  quantum?: number;
  processes: ProcessSpec[];
}

export async function postSchedule(body: ScheduleRequest): Promise<ScheduleResult> {
  try {
    return await request<ScheduleResult>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return runSchedule(body.processes, body.algorithm, body.quantum ?? 2);
  }
}

/* -------------------------------- quiz --------------------------------- */

export async function getQuiz(category: string): Promise<QuizQuestion[]> {
  return request<QuizQuestion[]>(`/api/quiz?category=${encodeURIComponent(category)}`, {
    method: "GET",
  });
}

export async function checkQuizAnswer(
  questionId: string,
  optionIndex: number,
): Promise<{ correct: boolean; explanation: string; answerIndex: number }> {
  return request<{ correct: boolean; explanation: string; answerIndex: number }>(
    "/api/quiz/check",
    {
      method: "POST",
      body: JSON.stringify({ questionId, optionIndex }),
    },
  );
}

export async function getQuizCategories(): Promise<QuizCategory[]> {
  return request<QuizCategory[]>("/api/quiz/categories", { method: "GET" });
}

/* ------------------------------ progress ------------------------------- */

export interface ProgressAlgorithm extends AlgorithmInfo {
  mastery: number | null;
}

export interface ProgressPayload {
  student: { name: string; firstName: string; email: string; level: string; course: string };
  stats: {
    overallProgress: number;
    topicsCompleted: number;
    problemsSolved: number;
    quizAccuracy: number;
    questionsCompleted: number;
    totalQuestions: number;
    quizProgress: number;
    course: { title: string; progress: number };
  };
  algorithms: ProgressAlgorithm[];
  activity: Array<{ title: string; detail: string; when: string; kind: string }>;
  profile: {
    level: string;
    strongest: string | null;
    needsPractice: string | null;
    recommendedNext: string;
  };
  weakAreas: Array<{ topic: string; score: number }>;
  quizPerformance: Array<{ week: string; score: number }>;
  timeSpent: Array<{ day: string; minutes: number }>;
  heatmap: Array<{ day: number; intensity: number }>;
}

export async function getProgress(): Promise<ProgressPayload> {
  return request<ProgressPayload>("/api/progress", { method: "GET" });
}

export const progressQuery = () => ({
  queryKey: ["progress", getSessionUserId()] as const,
  queryFn: getProgress,
});

export const quizCategoriesQuery = () => ({
  queryKey: ["quiz-categories", getSessionUserId()] as const,
  queryFn: getQuizCategories,
});

export async function getAlgorithms(): Promise<AlgorithmInfo[]> {
  try {
    const data = await request<AlgorithmInfo[]>("/api/algorithms", { method: "GET" });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Fall through
  }
  return algorithms;
}

export async function getResources(): Promise<Resource[]> {
  try {
    const data = await request<Resource[]>("/api/resources", { method: "GET" });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Fall through
  }
  return resources;
}
