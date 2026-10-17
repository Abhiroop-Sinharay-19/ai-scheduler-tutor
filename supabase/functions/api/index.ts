import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { summarizeQuizProgress } from "./quiz-progress.ts";

declare const Supabase: {
  ai: {
    Session: new (model: string) => {
      run(input: string, options: { mean_pool: true; normalize: true }): Promise<number[]>;
    };
  };
};

const embeddingSession = new Supabase.ai.Session("gte-small");
const embeddingDimension = 384;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const fail = (error: string, status = 400) => json({ error }, status);

type Process = { id: string; name: string; arrival: number; burst: number; priority: number };
const algorithms = new Set(["fcfs", "sjf", "srtf", "rr", "priority"]);

function validSchedule(
  body: unknown,
): body is { algorithm: string; quantum?: number; processes: Process[] } {
  if (!body || typeof body !== "object") return false;
  const input = body as { algorithm?: unknown; quantum?: unknown; processes?: unknown };
  return (
    typeof input.algorithm === "string" &&
    algorithms.has(input.algorithm) &&
    (!input.quantum ||
      (typeof input.quantum === "number" && Number.isFinite(input.quantum) && input.quantum > 0)) &&
    Array.isArray(input.processes) &&
    input.processes.length <= 100 &&
    input.processes.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        p.name.length <= 100 &&
        [p.arrival, p.burst, p.priority].every(
          (v) => typeof v === "number" && Number.isFinite(v),
        ) &&
        p.arrival >= 0 &&
        p.burst > 0,
    )
  );
}

function schedule(input: { algorithm: string; quantum?: number; processes: Process[] }) {
  const procs = input.processes.map((p) => ({
    ...p,
    remaining: p.burst,
    first: -1,
    completion: -1,
  }));
  const gantt: Array<{ name: string; start: number; end: number; idle?: boolean; reason: string }> =
    [];
  const steps: Array<{
    time: number;
    running: string | null;
    ready: string[];
    completed: string[];
    arrived: string[];
    note: string;
  }> = [];
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
    const arrived = procs.filter(
      (p) => p.arrival === time && p.remaining > 0 && p !== current && !queue.includes(p),
    );
    queue.push(...arrived);
    const choose = () => {
      if (!queue.length) return null;
      if (input.algorithm === "sjf")
        queue.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
      if (input.algorithm === "priority")
        queue.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
      if (input.algorithm === "srtf")
        queue.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
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
      steps.push({
        time,
        running: null,
        ready: [],
        completed: [...done],
        arrived: arrived.map((p) => p.name),
        note: "CPU idle",
      });
      addSlice("Idle", "No ready processes", true);
      time++;
      continue;
    }
    if (current.first < 0) current.first = time;
    steps.push({
      time,
      running: current.name,
      ready: queue.map((p) => p.name),
      completed: [...done],
      arrived: arrived.map((p) => p.name),
      note: `Running ${current.name}`,
    });
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
    name: p.name,
    arrival: p.arrival,
    burst: p.burst,
    completion: p.completion,
    turnaround: p.completion - p.arrival,
    waiting: p.completion - p.arrival - p.burst,
    response: p.first - p.arrival,
  }));
  const avg = (field: "waiting" | "turnaround" | "response") =>
    Number(
      (perProcess.reduce((n, p) => n + p[field], 0) / Math.max(1, perProcess.length)).toFixed(2),
    );
  const elapsed = Math.max(1, time - Math.min(...procs.map((p) => p.arrival), time));
  return {
    algorithm: input.algorithm,
    gantt,
    perProcess,
    steps,
    metrics: {
      avgWaiting: avg("waiting"),
      avgTurnaround: avg("turnaround"),
      avgResponse: avg("response"),
      cpuUtilization: Number(((busy / elapsed) * 100).toFixed(2)),
      totalTime: elapsed,
      throughput: Number((procs.length / elapsed).toFixed(2)),
    },
  };
}

const chatRateBuckets = new Map<string, number[]>();
function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (chatRateBuckets.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 20) return true;
  recent.push(now);
  chatRateBuckets.set(key, recent);
  return false;
}

async function createEmbedding(text: string): Promise<number[]> {
  const vector = await embeddingSession.run(text, { mean_pool: true, normalize: true });
  if (
    !Array.isArray(vector) ||
    vector.length !== embeddingDimension ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Embedding model returned an unexpected vector.");
  }
  return vector;
}

async function loadUserQuizAttempts(admin: ReturnType<typeof createClient>, userId: string) {
  const attempts: Array<{
    question_id: string;
    is_correct: boolean;
    answered_at: string;
  }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("quiz_attempts")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", userId)
      .order("answered_at", { ascending: false })
      .range(from, from + 999);
    if (error) return { data: null, error };
    attempts.push(...(data ?? []));
    if ((data ?? []).length < 1000) return { data: attempts, error: null };
  }
}

function safeHistory(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ role: "user" | "assistant"; content: string }>;
  return value
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim() &&
        item.content.length <= 2000,
    )
    .slice(-8)
    .map((item) => ({ role: item.role as "user" | "assistant", content: item.content.trim() }));
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
  const {
    data: { user },
  } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const body = req.method === "GET" ? null : await req.json().catch(() => null);
  const requireUser = () => (user ? null : fail("Authentication required.", 401));

  if (route === "/schedule") {
    if (req.method !== "POST") return fail("Method not allowed.", 405);
    if (!validSchedule(body)) return fail("Invalid schedule request.");
    const result = schedule(body);
    if (user) {
      const { error } = await admin.from("simulations").insert({
        user_id: user.id,
        algorithm_id: body.algorithm,
        quantum: body.quantum,
        processes: body.processes,
        result,
      });
      if (error) return fail(error.message, 500);
    }
    return json(result);
  }
  if (route === "/quiz") {
    const category = url.searchParams.get("category");
    let query = admin
      .from("quiz_questions")
      .select("id, category, prompt, options")
      .eq("is_published", true)
      .limit(10);
    if (category && category !== "mixed") query = query.eq("category", category);
    const { data, error } = await query;
    return error ? fail(error.message, 500) : json(data ?? []);
  }
  if (route === "/quiz/categories") {
    const authError = requireUser();
    if (authError) return authError;
    const [questions, attempts] = await Promise.all([
      admin.from("quiz_questions").select("id, category").eq("is_published", true),
      loadUserQuizAttempts(admin, user!.id),
    ]);
    if (questions.error || attempts.error) return fail("Unable to load quiz progress.", 500);
    const summary = summarizeQuizProgress(questions.data ?? [], attempts.data ?? []);
    const categories = summary.categories;
    if (summary.totalQuestions > 0) {
      categories.push({
        id: "mixed",
        label: "Mixed Scheduling",
        questions: summary.totalQuestions,
        completed: summary.questionsCompleted,
        progress: summary.progress,
      });
    }
    return json(categories);
  }
  if (route === "/quiz/check") {
    const authError = requireUser();
    if (authError) return authError;
    if (
      req.method !== "POST" ||
      !body ||
      typeof body.questionId !== "string" ||
      !Number.isInteger(body.optionIndex) ||
      body.optionIndex < 0
    )
      return fail("Invalid quiz answer.");
    const { data: q, error } = await admin
      .from("quiz_questions")
      .select("answer_index, explanation")
      .eq("id", body.questionId)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    if (!q) return fail("Question not found.", 404);
    const correct = q.answer_index === body.optionIndex;
    const { error: attemptError } = await admin.from("quiz_attempts").insert({
      user_id: user!.id,
      question_id: body.questionId,
      chosen_index: body.optionIndex,
      is_correct: correct,
    });
    if (attemptError) return fail("Unable to save your quiz answer.", 500);
    return json({ correct, explanation: q.explanation, answerIndex: q.answer_index });
  }
  if (route === "/resources") {
    const { data, error } = await admin.from("resources").select("*").eq("is_published", true);
    return error ? fail(error.message, 500) : json(data ?? []);
  }
  if (route === "/algorithms") {
    const { data, error } = await admin.from("algorithms").select("*");
    return error
      ? fail(error.message, 500)
      : json(
          (data ?? []).map((a) => ({
            ...a,
            howItWorks: a.how_it_works,
            advantages: a.advantages ?? [],
            disadvantages: a.disadvantages ?? [],
            examQuestions: a.exam_questions,
            aiExplanation: a.ai_explanation,
            mastery: 0,
          })),
        );
  }
  if (route === "/chat") {
    if (
      req.method !== "POST" ||
      !body ||
      typeof body.message !== "string" ||
      !body.message.trim() ||
      body.message.length > 12000
    )
      return fail("Invalid chat message.");
    if (!user) return fail("Authentication required.", 401);
    const sessionId =
      typeof body.sessionId === "string" &&
      body.sessionId.length > 0 &&
      body.sessionId.length <= 120
        ? body.sessionId
        : crypto.randomUUID();
    if (isRateLimited(user.id))
      return fail("Tutor rate limit reached. Please try again in a minute.", 429);

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    // Optional OpenAI-compatible endpoint for an evaluated, hosted QLoRA adapter.
    // Leaving this unset preserves the current OpenRouter production behavior.
    const fineTunedEndpoint = Deno.env.get("FINETUNED_QWEN_BASE_URL")?.replace(/\/+$/, "");
    const fineTunedKey = Deno.env.get("FINETUNED_QWEN_API_KEY");
    const fineTunedModel = Deno.env.get("FINETUNED_QWEN_MODEL");
    const fineTunedConfigRequested = Boolean(fineTunedEndpoint || fineTunedKey || fineTunedModel);
    if (fineTunedConfigRequested && !(fineTunedEndpoint && fineTunedKey && fineTunedModel)) {
      return fail(
        "Fine-tuned Qwen endpoint configuration is incomplete. Set FINETUNED_QWEN_BASE_URL, FINETUNED_QWEN_MODEL, and FINETUNED_QWEN_API_KEY together.",
        503,
      );
    }
    const useFineTunedEndpoint = Boolean(fineTunedEndpoint && fineTunedModel);
    const chatModel = useFineTunedEndpoint
      ? fineTunedModel!
      : Deno.env.get("OPENROUTER_MODEL") || "qwen/qwen3-235b-a22b-2507";
    const completionUrl = useFineTunedEndpoint
      ? `${fineTunedEndpoint}${fineTunedEndpoint!.endsWith("/v1") ? "/chat/completions" : "/v1/chat/completions"}`
      : "https://openrouter.ai/api/v1/chat/completions";
    const completionKey = useFineTunedEndpoint ? fineTunedKey : openRouterKey;
    const providerName = useFineTunedEndpoint ? "fine-tuned Qwen endpoint" : "OpenRouter";

    let history = safeHistory(body.history);
    if (user) {
      const { data: priorMessages, error } = await admin
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) {
        console.error("Tutor conversation load failed:", error.code, error.message);
        return fail("Unable to load this conversation.", 500);
      }
      history = (priorMessages ?? []).reverse().map((message) => ({
        role: message.role as "user" | "assistant",
        content: (message.content as string).slice(0, 2000),
      }));
    }

    const message = body.message.trim();
    const asksForSources =
      /\b(source|sources|citation|citations|reference|references)\b/i.test(message) ||
      /\bwhere did you get (?:this|that|the information)|where is this from|which (?:file|slide|notes?)|show me (?:the )?(?:source|reference)|provide (?:a )?citation\b/i.test(
        message,
      );
    const priorStudentQuestion = [...history]
      .reverse()
      .find((entry) => entry.role === "user")?.content;
    const followUpMessage =
      /^(and\b|also\b|then\b|why\b|how\b|what about\b|explain\b|continue\b|more\b|simpler\b|in that\b|the result\b)/i.test(
        message,
      );
    const retrievalQuery =
      followUpMessage && priorStudentQuestion ? `${priorStudentQuestion}\n${message}` : message;
    const precedingTutorTurn = history.at(-1);
    const awaitingRecallAnswer =
      precedingTutorTurn?.role === "assistant" &&
      /\?\s*(?:\*{1,2})?\s*$/.test(precedingTutorTurn.content.trim());
    const turnStartedAt = Date.now();
    const userMessageCreatedAt = new Date(turnStartedAt).toISOString();
    const assistantMessageCreatedAt = new Date(turnStartedAt + 1).toISOString();
    let embedding: number[];
    try {
      embedding = await createEmbedding(retrievalQuery);
    } catch (error) {
      console.error("Tutor embedding error:", error);
      return fail("The tutor could not search the course notes. Please try again shortly.", 502);
    }

    const { data: retrieved, error: searchError } = await admin.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 5,
    });
    if (searchError) {
      console.error("Tutor vector search error:", searchError.message);
      return fail("The course knowledge base is unavailable. Please try again shortly.", 503);
    }

    const sources = Array.from(
      new Map(
        (retrieved ?? []).map((item) => {
          const source = {
            filename: item.filename as string,
            page: (item.page_number as number | null) ?? null,
            topic: (item.topic as string | null) ?? null,
            section: (item.section as string | null) ?? null,
            similarity: Number(item.similarity),
          };
          return [`${source.filename}:${source.page}:${source.section}`, source] as const;
        }),
      ).values(),
    );
    if (!retrieved?.length) {
      const reply = asksForSources
        ? "I couldn't identify a relevant course reference for that question. Could you narrow it to a scheduling concept?"
        : "I'm not confident enough to answer that yet. Could you narrow it to a process-scheduling concept or share what you are trying to solve?";
      if (user) {
        const { error } = await admin.from("chat_messages").insert([
          {
            user_id: user.id,
            session_id: sessionId,
            role: "user",
            content: message,
            context: body.context ?? null,
            teaching_state: {},
            created_at: userMessageCreatedAt,
          },
          {
            user_id: user.id,
            session_id: sessionId,
            role: "assistant",
            content: reply,
            context: body.context ?? null,
            teaching_state: { stage: "clarify-topic" },
            created_at: assistantMessageCreatedAt,
          },
        ]);
        if (error) {
          console.error("Tutor conversation save failed:", error.code, error.message);
          return fail("Unable to save this conversation.", 500);
        }
      }
      return json({ reply, sessionId });
    }

    if (useFineTunedEndpoint && !fineTunedKey) {
      return fail(
        "The fine-tuned Qwen endpoint is missing its server API key. Set FINETUNED_QWEN_API_KEY in Supabase Edge Function secrets.",
        503,
      );
    }
    if (!completionKey) {
      return fail(
        "The tutor AI is not configured. Set OPENROUTER_API_KEY in Supabase Edge Function secrets.",
        503,
      );
    }

    let scheduleResult: unknown = null;
    const context = body.context && typeof body.context === "object" ? body.context : {};
    const calculationQuestion =
      /\b(calculate|compute|solve|work out|waiting time|turnaround time|response time|completion time|gantt chart)\b/i.test(
        message,
      );
    const requestedAlgorithm = /\b(srtf|shortest remaining time first)\b/i.test(message)
      ? "srtf"
      : /\b(sjf|shortest job first)\b/i.test(message)
        ? "sjf"
        : /\b(fcfs|first come first served)\b/i.test(message)
          ? "fcfs"
          : /\bround robin\b|\brr\b/i.test(message)
            ? "rr"
            : /\bpriority scheduling\b/i.test(message)
              ? "priority"
              : undefined;
    const scheduleInput = {
      algorithm: calculationQuestion
        ? (requestedAlgorithm ?? context.algorithm)
        : context.algorithm,
      quantum: context.quantum,
      processes: context.problem,
    };
    if (
      validSchedule(scheduleInput) &&
      scheduleInput.processes.length <= 20 &&
      scheduleInput.processes.reduce((total, process) => total + process.burst, 0) <= 200
    ) {
      const result = schedule(scheduleInput);
      scheduleResult = {
        algorithm: result.algorithm,
        gantt: result.gantt,
        perProcess: result.perProcess,
        metrics: result.metrics,
      };
    }

    const relevantContext = (retrieved as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((item, index) => {
        const location = [
          item.filename,
          item.page_number ? `page ${item.page_number}` : null,
          item.section,
        ]
          .filter(Boolean)
          .join(" · ");
        return `[Source ${index + 1}: ${location}]\n${String(item.content).slice(0, 1400)}`;
      })
      .join("\n\n");
    const systemPrompt = `You are a patient, interactive Operating Systems tutor focused on process scheduling. Teach from the supplied course excerpts and the student's conversation.

Teaching rules:
- Explain clearly and progressively, one concept at a time; keep each turn focused and concise.
- Invite active recall with a short question when useful, then wait for the student's answer.
- Treat the student's next message after your question as their attempt unless they clearly change topic. Evaluate it explicitly. If it is wrong, briefly identify the mistaken idea, give a hint without revealing the answer, and ask for one retry; reveal the answer only after that retry or if the student asks you to.
- On a first incorrect attempt, do not name the correct algorithm, give the formula, or state the answer. Say it is not quite right, give one small clue, and ask the student to try once more. Do not reveal the answer until the student retries or asks.
- Increase difficulty after correct answers and connect new ideas to what the student has already learned.
- For scheduling numericals, use the deterministic schedule result provided below. Guide one intermediate calculation at a time and ask the student to do the next step; never invent or recompute numeric results.
- When a deterministic schedule result is present, the process data is complete: use its Gantt intervals and metrics as ground truth. Never claim that values are missing or substitute a different example. If no result is present, ask for the missing input.
- If a scheduling numerical has no deterministic result because the process data is incomplete, ask for the missing arrival, burst, priority, or quantum values instead of calculating it yourself.
- Use a process-scheduling example where helpful. Format Gantt timelines as a pipe-delimited line.
- Use retrieved excerpts silently as factual grounding. Do not mention retrieval, notes, excerpts, documents, filenames, pages, or citations unless the student explicitly asks for a source. If the context does not support a claim, acknowledge uncertainty and ask a focused follow-up without referring to documents or sources. If asked for sources, do not invent or list metadata yourself; the application will add verified references. Do not reveal hidden reasoning.
- Do not dump a full lesson or a complete numerical solution unless the student explicitly asks for it.

Current turn status: ${awaitingRecallAnswer ? "The student is answering your immediately previous question; evaluate this as their first attempt." : "The student has not just answered a tutor question."}\n\nCourse excerpts:\n${relevantContext}\n\nStudent topic/context: ${JSON.stringify({ page: context.page, algorithm: scheduleInput.algorithm, mode: context.mode })}\nDeterministic schedule result (if present): ${scheduleResult ? JSON.stringify(scheduleResult) : "none"}`;
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let modelResponse: Response;
    try {
      modelResponse = await fetch(completionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${completionKey}`,
          "Content-Type": "application/json",
          ...(useFineTunedEndpoint ? {} : { "X-OpenRouter-Title": "Process Scheduling Tutor" }),
        },
        body: JSON.stringify({
          model: chatModel,
          messages,
          max_tokens: 1000,
          ...(useFineTunedEndpoint ? {} : { reasoning_effort: "low" }),
          temperature: 0.55,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return fail(
          `${providerName} timed out while generating a tutor response. Please try again.`,
          504,
        );
      }
      console.error(
        `Tutor ${providerName} request failed.`,
        error instanceof Error ? error.name : "unknown",
      );
      return fail(`The tutor could not reach ${providerName}. Please try again shortly.`, 502);
    } finally {
      clearTimeout(timeout);
    }
    if (!modelResponse.ok) {
      const providerError = await modelResponse.json().catch(() => null);
      const providerMessage =
        typeof providerError?.error?.message === "string"
          ? providerError.error.message.slice(0, 240)
          : null;
      console.error(`Tutor ${providerName} response status:`, modelResponse.status, {
        code: providerError?.error?.code ?? null,
        message: providerMessage,
      });
      if (modelResponse.status === 401 || modelResponse.status === 403) {
        return fail(
          useFineTunedEndpoint
            ? "The fine-tuned Qwen endpoint rejected its server API key. Check FINETUNED_QWEN_API_KEY in Supabase secrets."
            : "OpenRouter rejected the server API key. Check OPENROUTER_API_KEY in Supabase secrets.",
          503,
        );
      }
      if (modelResponse.status === 429) {
        return fail(
          `${providerName} is rate limiting requests. Please wait a moment and try again.`,
          429,
        );
      }
      if (modelResponse.status === 402) {
        return fail(
          `${providerName} reports that this request cannot be served with the current account or model availability.`,
          503,
        );
      }
      if (modelResponse.status === 404 || modelResponse.status === 503) {
        return fail(
          `The configured ${providerName} model is unavailable right now. Please try again shortly.`,
          503,
        );
      }
      return fail(`${providerName} could not generate a tutor response. Please try again.`, 502);
    }
    const modelResult = await modelResponse.json().catch(() => null);
    const completion = modelResult?.choices?.[0];
    const generatedContent = completion?.message?.content;
    const reply =
      typeof generatedContent === "string"
        ? generatedContent.trim()
        : Array.isArray(generatedContent)
          ? generatedContent
              .map((part: unknown) =>
                typeof part === "string"
                  ? part
                  : part &&
                      typeof part === "object" &&
                      "text" in part &&
                      typeof part.text === "string"
                    ? part.text
                    : "",
              )
              .join("")
              .trim()
          : generatedContent && typeof generatedContent === "object"
            ? (["text", "output_text", "content", "value"]
                .map((key) =>
                  key in generatedContent && typeof generatedContent[key] === "string"
                    ? generatedContent[key]
                    : "",
                )
                .sort((left, right) => right.length - left.length)
                .find(Boolean)
                ?.trim() ?? "")
            : typeof completion?.message?.refusal === "string"
              ? completion.message.refusal.trim()
              : "";
    if (typeof reply !== "string" || !reply) {
      console.error("OpenRouter returned no tutor text:", {
        model: chatModel,
        actualModel: modelResult?.model ?? null,
        finishReason: completion?.finish_reason ?? null,
        contentType: Array.isArray(generatedContent) ? "array" : typeof generatedContent,
        contentFields:
          generatedContent && typeof generatedContent === "object"
            ? Object.keys(generatedContent)
            : [],
        messageFields:
          completion?.message && typeof completion.message === "object"
            ? Object.keys(completion.message)
            : [],
        providerError: modelResult?.error?.code ?? modelResult?.error?.type ?? null,
      });
      return fail(
        "OpenRouter returned an empty or malformed tutor response. Please try again.",
        502,
      );
    }

    const visibleReply =
      asksForSources && sources.length
        ? `${reply}\n\nCourse references:\n${sources
            .slice(0, 3)
            .map(({ filename, page }) => `- ${filename}${page ? ` · Page ${page}` : ""}`)
            .join("\n")}`
        : reply;

    if (user) {
      const teachingState = {
        topic: scheduleInput.algorithm ?? "process scheduling",
        stage: "interactive-teaching",
        sources: sources.map(({ filename, page }) => ({ filename, page })),
      };
      const { error } = await admin.from("chat_messages").insert([
        {
          user_id: user.id,
          session_id: sessionId,
          role: "user",
          content: message,
          context: body.context ?? null,
          teaching_state: {},
          created_at: userMessageCreatedAt,
        },
        {
          user_id: user.id,
          session_id: sessionId,
          role: "assistant",
          content: visibleReply,
          context: { ...(body.context ?? {}), sources },
          teaching_state: teachingState,
          created_at: assistantMessageCreatedAt,
        },
      ]);
      if (error) {
        console.error("Tutor conversation save failed:", error.code, error.message);
        return fail("Unable to save this conversation.", 500);
      }
    }
    return json({ reply: visibleReply, sessionId });
  }
  if (route === "/progress") {
    const authError = requireUser();
    if (authError) return authError;
    const activitySince = new Date(Date.now() - 98 * 24 * 60 * 60 * 1000).toISOString();
    const [profile, progress, attempts, simulations, algorithmRows, questions, simulationCount] =
      await Promise.all([
        admin.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        admin.from("algorithm_progress").select("*").eq("user_id", user!.id),
        loadUserQuizAttempts(admin, user!.id),
        admin
          .from("simulations")
          .select("created_at, algorithm_id")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .gte("created_at", activitySince)
          .limit(1000),
        admin.from("algorithms").select("*"),
        admin.from("quiz_questions").select("id, category").eq("is_published", true),
        admin
          .from("simulations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
      ]);
    if (
      profile.error ||
      progress.error ||
      attempts.error ||
      simulations.error ||
      algorithmRows.error ||
      questions.error ||
      simulationCount.error
    )
      return fail("Unable to load progress.", 500);
    const mastery = new Map((progress.data ?? []).map((p) => [p.algorithm_id, p.mastery]));
    const listedAlgorithms = (algorithmRows.data ?? []).map((a) => ({
      ...a,
      howItWorks: a.how_it_works,
      advantages: a.advantages,
      disadvantages: a.disadvantages,
      examQuestions: a.exam_questions,
      aiExplanation: a.ai_explanation,
      mastery: mastery.get(a.id) ?? null,
    }));
    const quizSummary = summarizeQuizProgress(questions.data ?? [], attempts.data ?? []);
    const { questionsCompleted, totalQuestions, progress: quizProgress, accuracy } = quizSummary;
    const publishedQuestionIds = new Set((questions.data ?? []).map((question) => question.id));
    const quizAttempts = (attempts.data ?? []).filter((attempt) =>
      publishedQuestionIds.has(attempt.question_id),
    );
    const p = profile.data;
    const assessedAlgorithms = listedAlgorithms.filter(
      (algorithm): algorithm is typeof algorithm & { mastery: number } =>
        algorithm.mastery !== null,
    );
    const strongest = [...assessedAlgorithms].sort((a, b) => b.mastery - a.mastery)[0];
    const needsPractice = [...assessedAlgorithms].sort((a, b) => a.mastery - b.mastery)[0];
    const quizWeeks = new Map<string, { count: number; correct: number }>();
    for (const attempt of quizAttempts) {
      const date = new Date(attempt.answered_at);
      const day = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() - day + 1);
      const week = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      const item = quizWeeks.get(week) ?? { count: 0, correct: 0 };
      item.count++;
      if (attempt.is_correct) item.correct++;
      quizWeeks.set(week, item);
    }
    const quizPerformance = [...quizWeeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, result]) => ({
        week,
        score: Math.round((result.correct / result.count) * 100),
      }));
    const activityItems = [
      ...(simulations.data ?? []).map((simulation) => ({
        title: `Solved ${simulation.algorithm_id.toUpperCase()} problem`,
        detail: "Simulation saved",
        when: simulation.created_at,
        kind: "problem",
      })),
      ...quizAttempts.map((attempt) => ({
        title: attempt.is_correct
          ? "Answered a quiz question correctly"
          : "Answered a quiz question",
        detail: "Quiz response saved",
        when: attempt.answered_at,
        kind: "quiz",
      })),
    ].sort((a, b) => b.when.localeCompare(a.when));
    const dailyActivity = new Map<string, number>();
    for (const event of [
      ...(simulations.data ?? []).map((simulation) => simulation.created_at),
      ...quizAttempts.map((attempt) => attempt.answered_at),
    ]) {
      const day = event.slice(0, 10);
      dailyActivity.set(day, (dailyActivity.get(day) ?? 0) + 1);
    }
    const heatmap = Array.from({ length: 98 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (97 - index));
      const day = date.toISOString().slice(0, 10);
      return { day: index, intensity: Math.min(4, dailyActivity.get(day) ?? 0) };
    });
    const profileName = typeof p?.full_name === "string" ? p.full_name.trim() : "";
    const metadataName =
      typeof user!.user_metadata?.full_name === "string"
        ? user!.user_metadata.full_name.trim()
        : "";
    const emailName = user!.email?.split("@")[0]?.trim().toLowerCase() ?? "";
    const displayName =
      profileName &&
      profileName.toLowerCase() !== "student" &&
      profileName.toLowerCase() !== emailName
        ? profileName
        : metadataName;
    const metadataLevel = user!.user_metadata?.level;
    const level =
      p?.level ??
      (metadataLevel === "Intermediate" || metadataLevel === "Advanced"
        ? metadataLevel
        : "Beginner");
    const course = p?.course ?? "Operating Systems — CPU Scheduling";
    return json({
      student: {
        name: displayName,
        firstName: displayName.split(/\s+/)[0] ?? "",
        email: user!.email ?? "",
        level,
        course,
      },
      stats: {
        overallProgress: assessedAlgorithms.length
          ? Math.round(
              assessedAlgorithms.reduce((n, a) => n + a.mastery, 0) / assessedAlgorithms.length,
            )
          : 0,
        topicsCompleted: assessedAlgorithms.filter((a) => a.mastery >= 80).length,
        problemsSolved: simulationCount.count ?? 0,
        quizAccuracy: accuracy,
        questionsCompleted,
        totalQuestions,
        quizProgress,
        course: { title: course, progress: quizProgress },
      },
      algorithms: listedAlgorithms,
      activity: activityItems.slice(0, 8),
      profile: {
        level,
        strongest: strongest?.name ?? null,
        needsPractice: needsPractice?.name ?? null,
        recommendedNext: "Complete a quiz or scheduling simulation",
      },
      weakAreas: assessedAlgorithms
        .filter((algorithm) => algorithm.mastery < 80)
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 4)
        .map((a) => ({ topic: a.name, score: a.mastery })),
      quizPerformance,
      timeSpent: [],
      heatmap,
    });
  }
  return fail("Route not found.", 404);
});
