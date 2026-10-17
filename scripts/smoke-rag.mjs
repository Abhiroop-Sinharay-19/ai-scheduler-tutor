import { randomUUID } from "node:crypto";
import { embedTexts } from "./local-embeddings.mjs";

const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(
  /\/$/,
  "",
);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!baseUrl || !serviceKey || !anonKey) {
  throw new Error("Set Supabase URL, SUPABASE_SERVICE_ROLE_KEY, and VITE_SUPABASE_ANON_KEY.");
}

async function request(path, init = {}, key = serviceKey) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok)
    throw new Error(`${path}: ${response.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

const rows = await request("/rest/v1/knowledge_chunks?select=filename&limit=1000");
if (!Array.isArray(rows) || rows.length === 0)
  throw new Error("No indexed knowledge chunks found.");
const documents = [...new Set(rows.map((row) => row.filename))];
const counts = Object.fromEntries(
  documents.map((filename) => [filename, rows.filter((row) => row.filename === filename).length]),
);
console.log(
  `Indexed database rows: ${rows.length}; distinct documents: ${documents.length}; chunks per document: ${JSON.stringify(counts)}`,
);

const [queryVector] = await embedTexts([
  "In shortest remaining time first scheduling, when does a new process preempt the currently running process?",
]);
const matches = await request("/rest/v1/rpc/match_knowledge_chunks", {
  method: "POST",
  body: JSON.stringify({ query_embedding: queryVector, match_threshold: 0.2, match_count: 5 }),
});
if (!Array.isArray(matches) || matches.length === 0)
  throw new Error("Semantic retrieval returned no matches.");
console.log(
  "Semantic retrieval top matches:",
  JSON.stringify(
    matches.slice(0, 3).map(({ filename, page_number, section, similarity }) => ({
      filename,
      page: page_number,
      section,
      similarity: Number(similarity),
    })),
  ),
);

const unique = randomUUID().replaceAll("-", "");
const email = `rag-smoke-${unique}@example.invalid`;
const password = `${randomUUID()}Aa1!`;
let userId;
try {
  const created = await request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  userId = created.id;
  await request("/rest/v1/chat_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      session_id: `rag-persistence-probe-${unique}`,
      role: "user",
      content: "temporary persistence probe",
      teaching_state: {},
    }),
  });
  console.log("Conversation persistence schema: writable");
  const loginResponse = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginResponse.json();
  if (!loginResponse.ok || !login.access_token) {
    throw new Error(`Temporary test-user sign-in failed: ${loginResponse.status}`);
  }

  const sessionId = `rag-smoke-${unique}`;
  const chat = async (message, context = {}) => {
    const response = await fetch(`${baseUrl}/functions/v1/api?route=%2Fchat`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${login.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        sessionId,
        context: { page: "/tutor", ...context },
      }),
    });
    const result = await response.json();
    if (
      response.status === 503 &&
      typeof result.error === "string" &&
      (result.error.includes("no available inference credits") ||
        result.error.includes("OPENROUTER_API_KEY"))
    ) {
      console.log("LLM configuration/provider blocker:", result.error);
      return null;
    }
    if (!response.ok)
      throw new Error(`Chat request failed: ${response.status} ${JSON.stringify(result)}`);
    return result;
  };

  if (!process.argv.includes("--skip-chat")) {
    const runChatScenario = async () => {
      const numericalOnly = process.argv.includes("--numerical-only");
      const teachingOnly = process.argv.includes("--teaching-only");
      const first = await chat(
        numericalOnly
          ? "For P1=0, P2=1, P3=2, calculate FCFS waiting time."
          : teachingOnly
            ? "Ask me one short recall question: which scheduling algorithm minimizes average waiting time? Do not reveal the answer; wait for my response."
            : "What is FCFS scheduling? Explain progressively and end with one short recall question.",
        {
          algorithm: "fcfs",
          problem: [
            { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 1 },
            { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 2 },
            { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 3 },
          ],
        },
      );
      if (first) {
        if (!first.reply || !first.sessionId || !first.sources?.length) {
          throw new Error("Chat response omitted reply, session ID, or retrieved source metadata.");
        }
        const showTurn = (label, result) => {
          if (!result || !result.reply || result.sessionId !== sessionId) {
            throw new Error(`${label} did not return a reply in the same session.`);
          }
          console.log(
            label,
            JSON.stringify({
              reply: result.reply.slice(0, 700),
              sources: result.sources,
              sessionId: result.sessionId,
              model: result.model,
              ...(result.calculation ? { calculation: result.calculation } : {}),
            }),
          );
        };
        showTurn("FCFS tutor answer:", first);

        if (numericalOnly) {
          if (
            first.calculation?.algorithm !== "fcfs" ||
            first.calculation.metrics.avgWaiting !== 3.33
          ) {
            throw new Error(
              `Unexpected deterministic FCFS result: ${JSON.stringify(first.calculation ?? null)}`,
            );
          }
          const followUp = await chat("Explain the result.");
          if (!followUp) return;
          showTurn("Numerical follow-up:", followUp);
          return;
        }
        if (teachingOnly) {
          const incorrect = await chat("FCFS.");
          if (!incorrect) return;
          showTurn("First incorrect recall attempt:", incorrect);
          if (/\bSJF\b|shortest job first|the answer is/i.test(incorrect.reply)) {
            throw new Error("The tutor revealed the recall answer before the student retried.");
          }
          if (!/hint|clue|try again|think about|consider/i.test(incorrect.reply)) {
            throw new Error("The tutor did not provide a clear hint after the incorrect answer.");
          }
          const retry = await chat("SJF minimizes average waiting time.");
          if (!retry) return;
          showTurn("Correct retry:", retry);
          return;
        }

        const comparison = await chat("What is the difference between FCFS and SJF?", {
          algorithm: "sjf",
          problem: [
            { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 1 },
            { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 2 },
            { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 3 },
          ],
        });
        if (!comparison) return;
        showTurn("FCFS vs SJF:", comparison);

        const roundRobin = await chat("Explain Round Robin scheduling.", {
          algorithm: "rr",
          quantum: 2,
          problem: [
            { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 1 },
            { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 2 },
          ],
        });
        if (!roundRobin) return;
        showTurn("Round Robin:", roundRobin);

        const recall = await chat("Ask me one question about waiting time.");
        if (!recall) return;
        showTurn("Waiting-time recall:", recall);

        const misconception = await chat("What is the main disadvantage of FCFS?");
        if (!misconception) return;
        showTurn("FCFS recall question:", misconception);

        const incorrect = await chat("It always gives the shortest waiting time.");
        if (!incorrect) return;
        showTurn("Incorrect-answer coaching:", incorrect);

        const numerical = await chat("For P1=0, P2=1, P3=2, calculate FCFS waiting time.", {
          algorithm: "fcfs",
          problem: [
            { id: "p1", name: "P1", arrival: 0, burst: 5, priority: 1 },
            { id: "p2", name: "P2", arrival: 1, burst: 3, priority: 2 },
            { id: "p3", name: "P3", arrival: 2, burst: 2, priority: 3 },
          ],
        });
        if (!numerical) return;
        showTurn("Deterministic FCFS explanation:", numerical);

        const explain = await chat("Explain the result.");
        if (!explain) return;
        showTurn("Numerical follow-up:", explain);
      } else {
        console.log(
          "Tutor response/session behavior could not be tested until OpenRouter is configured and available.",
        );
      }
    };
    await runChatScenario();
  } else {
    console.log("Chat generation test skipped by request.");
  }

  const schedule = await request(
    "/functions/v1/api?route=%2Fschedule",
    {
      method: "POST",
      body: JSON.stringify({
        algorithm: "fcfs",
        processes: [
          { id: "p1", name: "P1", arrival: 0, burst: 3, priority: 1 },
          { id: "p2", name: "P2", arrival: 1, burst: 2, priority: 2 },
        ],
      }),
      headers: { Authorization: `Bearer ${login.access_token}`, apikey: anonKey },
    },
    anonKey,
  );
  console.log(
    "Existing scheduling endpoint:",
    JSON.stringify({
      algorithm: schedule.algorithm,
      gantt: schedule.gantt,
      metrics: schedule.metrics,
    }),
  );
} finally {
  if (userId) {
    await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE" }).catch(() => {});
  }
}
