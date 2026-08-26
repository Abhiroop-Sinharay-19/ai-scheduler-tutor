import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, status = 400) => json({ error }, status);

type Process = { id: string; name: string; arrival: number; burst: number; priority: number };
const algorithms = new Set(["fcfs", "sjf", "srtf", "rr", "priority"]);

function validSchedule(body: unknown): body is { algorithm: string; quantum?: number; processes: Process[] } {
  if (!body || typeof body !== "object") return false;
  const input = body as { algorithm?: unknown; quantum?: unknown; processes?: unknown };
  return (
    typeof input.algorithm === "string" &&
    algorithms.has(input.algorithm) &&
    (!input.quantum || (typeof input.quantum === "number" && Number.isFinite(input.quantum) && input.quantum > 0)) &&
    Array.isArray(input.processes) &&
    input.processes.length <= 100 &&
    input.processes.every(
      (p) =>
        p && typeof p.id === "string" && typeof p.name === "string" && p.name.length <= 100 &&
        [p.arrival, p.burst, p.priority].every((v) => typeof v === "number" && Number.isFinite(v)) &&
        p.arrival >= 0 && p.burst > 0,
    )
  );
}

function schedule(input: { algorithm: string; quantum?: number; processes: Process[] }) {
  const procs = input.processes.map((p) => ({ ...p, remaining: p.burst, first: -1, completion: -1 }));
  const gantt: Array<{ name: string; start: number; end: number; idle?: boolean; reason: string }> = [];
  const steps: Array<{ time: number; running: string | null; ready: string[]; completed: string[]; arrived: string[]; note: string }> = [];
  const done: string[] = [];
  let time = procs.length ? Math.min(...procs.map((p) => p.arrival)) : 0;
  let current: (typeof procs)[number] | null = null;
  let quantumUsed = 0;
  let busy = 0;
  const queue: typeof procs = [];
  const addSlice = (name: string, reason: string, idle = false) => {
    const last = gantt.at(-1);
    if (last && last.name === name && last.idle === idle && last.end === time) last.end++;
    else gantt.push({ name, start: time, end: time + 1, idle, reason });
  };
  while (done.length < procs.length) {
    const arrived = procs.filter((p) => p.arrival === time && p.remaining > 0 && p !== current && !queue.includes(p));
    queue.push(...arrived);
    const choose = () => {
      if (!queue.length) return null;
      if (input.algorithm === "sjf") queue.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
      if (input.algorithm === "priority") queue.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
      if (input.algorithm === "srtf") queue.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
      return queue.shift()!;
    };
    if (input.algorithm === "srtf" && current) {
      queue.push(current);
      current = null;
    }
    if (!current) {
      current = choose();
      quantumUsed = 0;
    }
    if (!current) {
      steps.push({ time, running: null, ready: [], completed: [...done], arrived: arrived.map((p) => p.name), note: "CPU idle" });
      addSlice("Idle", "No ready processes", true);
      time++;
      continue;
    }
    if (current.first < 0) current.first = time;
    steps.push({ time, running: current.name, ready: queue.map((p) => p.name), completed: [...done], arrived: arrived.map((p) => p.name), note: `Running ${current.name}` });
    addSlice(current.name, input.algorithm === "rr" ? "Time quantum" : "Selected by scheduler");
    current.remaining--;
    busy++;
    time++;
    quantumUsed++;
    if (current.remaining === 0) {
      current.completion = time;
      done.push(current.name);
      current = null;
    } else if (input.algorithm === "rr" && quantumUsed >= (input.quantum ?? 2)) {
      queue.push(current);
      current = null;
    }
  }
  const perProcess = procs.map((p) => ({
    name: p.name, arrival: p.arrival, burst: p.burst, completion: p.completion,
    turnaround: p.completion - p.arrival, waiting: p.completion - p.arrival - p.burst, response: p.first - p.arrival,
  }));
  const avg = (field: "waiting" | "turnaround" | "response") => Number((perProcess.reduce((n, p) => n + p[field], 0) / Math.max(1, perProcess.length)).toFixed(2));
  const elapsed = Math.max(1, time - Math.min(...procs.map((p) => p.arrival), time));
  return { algorithm: input.algorithm, gantt, perProcess, steps, metrics: { avgWaiting: avg("waiting"), avgTurnaround: avg("turnaround"), avgResponse: avg("response"), cpuUtilization: Number((busy / elapsed * 100).toFixed(2)), totalTime: elapsed, throughput: Number((procs.length / elapsed).toFixed(2)) } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) return fail("Server is not configured.", 500);
  const admin = createClient(projectUrl, serviceKey);
  const url = new URL(req.url);
  const route = (url.searchParams.get("route") ?? "").replace(/^\/api/, "");
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const body = req.method === "GET" ? null : await req.json().catch(() => null);
  const requireUser = () => user ? null : fail("Authentication required.", 401);

  if (route === "/schedule") {
    if (req.method !== "POST") return fail("Method not allowed.", 405);
    if (requireUser()) return requireUser()!;
    if (!validSchedule(body)) return fail("Invalid schedule request.");
    const result = schedule(body);
    const { error } = await admin.from("simulations").insert({ user_id: user!.id, algorithm_id: body.algorithm, quantum: body.quantum, processes: body.processes, result });
    return error ? fail(error.message, 500) : json(result);
  }
  if (route === "/quiz") {
    const category = url.searchParams.get("category");
    let query = admin.from("quiz_questions").select("id, category, prompt, options").eq("is_published", true).limit(10);
    if (category && category !== "mixed") query = query.eq("category", category);
    const { data, error } = await query;
    return error ? fail(error.message, 500) : json(data ?? []);
  }
  if (route === "/quiz/categories") {
    const { data, error } = await admin.from("quiz_questions").select("category").eq("is_published", true);
    if (error) return fail(error.message, 500);
    const counts = new Map<string, number>();
    for (const q of data ?? []) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
    return json([...counts.entries()].map(([id, questions]) => ({ id, label: id === "rr" ? "Round Robin" : id === "priority" ? "Priority Scheduling" : id.toUpperCase(), questions, accuracy: 0 })).concat({ id: "mixed", label: "Mixed Scheduling", questions: Math.min(10, (data ?? []).length), accuracy: 0 }));
  }
  if (route === "/quiz/check") {
    if (req.method !== "POST" || !body || typeof body.questionId !== "string" || !Number.isInteger(body.optionIndex) || body.optionIndex < 0) return fail("Invalid quiz answer.");
    const { data: q, error } = await admin.from("quiz_questions").select("answer_index, explanation").eq("id", body.questionId).eq("is_published", true).maybeSingle();
    if (error) return fail(error.message, 500);
    if (!q) return fail("Question not found.", 404);
    const correct = q.answer_index === body.optionIndex;
    if (user) await admin.from("quiz_attempts").insert({ user_id: user.id, question_id: body.questionId, chosen_index: body.optionIndex, is_correct: correct });
    return json({ correct, explanation: q.explanation, answerIndex: q.answer_index });
  }
  if (route === "/resources") {
    const { data, error } = await admin.from("resources").select("*").eq("is_published", true);
    return error ? fail(error.message, 500) : json(data ?? []);
  }
  if (route === "/algorithms") {
    const { data, error } = await admin.from("algorithms").select("*");
    return error ? fail(error.message, 500) : json((data ?? []).map((a) => ({ ...a, howItWorks: a.how_it_works, examQuestions: a.exam_questions, aiExplanation: a.ai_explanation, mastery: 0 })));
  }
  if (route === "/chat") {
    if (req.method !== "POST" || !body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 12000) return fail("Invalid chat message.");
    if (requireUser()) return requireUser()!;
    const reply = `Let's work through ${body.context?.algorithm ?? "CPU scheduling"}. ${body.message.trim()}\n\nStart with the ready queue and build the Gantt chart one decision at a time.`;
    const { error } = await admin.from("chat_messages").insert([{ user_id: user!.id, role: "user", content: body.message.trim(), context: body.context ?? null }, { user_id: user!.id, role: "assistant", content: reply, context: body.context ?? null }]);
    return error ? fail(error.message, 500) : json({ reply });
  }
  if (route === "/progress") {
    if (requireUser()) return requireUser()!;
    const [profile, progress, attempts, simulations, algorithmRows] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user!.id).single(), admin.from("algorithm_progress").select("*").eq("user_id", user!.id), admin.from("quiz_attempts").select("is_correct, answered_at").eq("user_id", user!.id).order("answered_at", { ascending: false }).limit(100), admin.from("simulations").select("created_at, algorithm_id").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20), admin.from("algorithms").select("*"),
    ]);
    if (profile.error || progress.error || attempts.error || simulations.error || algorithmRows.error) return fail("Unable to load progress.", 500);
    const mastery = new Map((progress.data ?? []).map((p) => [p.algorithm_id, p.mastery]));
    const listedAlgorithms = (algorithmRows.data ?? []).map((a) => ({ ...a, howItWorks: a.how_it_works, advantages: a.advantages, disadvantages: a.disadvantages, examQuestions: a.exam_questions, aiExplanation: a.ai_explanation, mastery: mastery.get(a.id) ?? 0 }));
    const attemptsData = attempts.data ?? [];
    const accuracy = attemptsData.length ? Math.round(attemptsData.filter((a) => a.is_correct).length / attemptsData.length * 100) : 0;
    const p = profile.data!;
    return json({ student: { name: p.full_name, email: user!.email ?? "", level: p.level, streak: p.streak, course: p.course, xp: p.xp, badges: [] }, stats: { overallProgress: listedAlgorithms.length ? Math.round(listedAlgorithms.reduce((n, a) => n + a.mastery, 0) / listedAlgorithms.length) : 0, topicsCompleted: listedAlgorithms.filter((a) => a.mastery >= 80).length, problemsSolved: (simulations.data ?? []).length, quizAccuracy: accuracy, streak: p.streak, course: { title: p.course, progress: 0, currentTopic: "CPU Scheduling", timeRemaining: "" } }, algorithms: listedAlgorithms, activity: (simulations.data ?? []).map((s) => ({ title: `Solved ${s.algorithm_id.toUpperCase()} problem`, detail: "Simulation saved", when: s.created_at, kind: "problem" })), profile: { level: p.level, strongest: listedAlgorithms.sort((a, b) => b.mastery - a.mastery)[0]?.name ?? "Not assessed", needsPractice: listedAlgorithms.sort((a, b) => a.mastery - b.mastery)[0]?.name ?? "Not assessed", recommendedNext: "Complete a simulation", learningStyle: "Step-by-step explanations" }, weakAreas: listedAlgorithms.sort((a, b) => a.mastery - b.mastery).slice(0, 4).map((a) => ({ topic: a.name, score: a.mastery })), quizPerformance: [], timeSpent: [], heatmap: [] });
  }
  return fail("Route not found.", 404);
});
