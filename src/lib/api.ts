/**
 * API service layer.
 *
 * Every screen talks to these functions only — never to mock data directly.
 * Each call first tries the real backend (FastAPI later, e.g. VITE_API_BASE_URL
 * pointing at http://localhost:8000) and transparently falls back to local
 * mock/simulation logic so the UI is fully usable today.
 */
import {
  type AlgorithmId,
  type ProcessSpec,
  type ScheduleResult,
} from "./scheduling";
import {
  algorithms,
  dashboardStats,
  learningProfile,
  quizPerformance,
  recentActivity,
  student,
  timeSpent,
  weakAreas,
  activityHeatmap,
  type QuizQuestion,
} from "./mock-data";
import { getAccessToken, signOut } from "./supabase";

const API_BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

function endpoint(path: string) {
  if (API_BASE) return `${API_BASE}${path}`;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const [route, query = ""] = path.replace(/^\/api/, "").split("?");
    const target = new URL(`${SUPABASE_URL}/functions/v1/api`);
    target.searchParams.set("route", route);
    new URLSearchParams(query).forEach((value, key) => target.searchParams.set(key, value));
    return target.toString();
  }
  return null;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const target = endpoint(path);
  if (!target) throw new Error("API is not configured. Add Supabase credentials or VITE_API_BASE_URL.");
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
  if (res.status === 401) {
    signOut();
    if (typeof window !== "undefined") window.location.assign("/login");
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
  context?: {
    page?: string;
    algorithm?: AlgorithmId;
    problem?: ProcessSpec[];
    mode?: "explain" | "simplify" | "example" | "quiz";
  };
}

export async function postChat(body: ChatRequest): Promise<{ reply: string }> {
  return request("/api/chat", { method: "POST", body: JSON.stringify(body) });
}

/* ----------------------------- scheduling ------------------------------ */

export interface ScheduleRequest {
  algorithm: AlgorithmId;
  quantum?: number;
  processes: ProcessSpec[];
}

export async function postSchedule(body: ScheduleRequest): Promise<ScheduleResult> {
  return request("/api/schedule", { method: "POST", body: JSON.stringify(body) });
}

/* -------------------------------- quiz --------------------------------- */

export async function getQuiz(category: string): Promise<QuizQuestion[]> {
  return request(`/api/quiz?category=${encodeURIComponent(category)}`, { method: "GET" });
}

export async function checkQuizAnswer(
  questionId: string,
  optionIndex: number,
): Promise<{ correct: boolean; explanation: string; answerIndex: number }> {
  return request("/api/quiz/check", { method: "POST", body: JSON.stringify({ questionId, optionIndex }) });
}

export async function getQuizCategories() {
  return request("/api/quiz/categories", { method: "GET" });
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
  return request("/api/progress", { method: "GET" });
}

export async function getAlgorithms() {
  return request("/api/algorithms", { method: "GET" });
}

export async function getResources() {
  return request("/api/resources", { method: "GET" });
}
