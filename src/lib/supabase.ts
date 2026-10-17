import { createClient, type AuthChangeEvent, type Session, type User } from "@supabase/supabase-js";

const env: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};
const url = env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
const storageKey = "pst.supabase.session";

export type AuthSession = Session;
export type SignupProfile = {
  fullName: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  institution?: string;
  studyYear?: string;
  learningGoal?: string;
};

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.",
    );
  }
  if (typeof window === "undefined") {
    throw new Error("Supabase browser authentication was requested during server rendering.");
  }
  client ??= createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      // Keep sessions created by the previous auth helper available to the SDK.
      storageKey,
    },
  });
  return client;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Supabase sign-in succeeded without creating a session.");
  return data.session;
}

export async function signUp(
  email: string,
  password: string,
  profile: SignupProfile,
): Promise<Session | null> {
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile.fullName,
        level: profile.level,
        institution: profile.institution || null,
        study_year: profile.studyYear || null,
        learning_goal: profile.learningGoal || null,
      },
    },
  });
  if (error) throw error;
  return data.session;
}

export async function verifySignupOtp(email: string, token: string): Promise<Session> {
  const { data, error } = await getClient().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  if (!data.session) throw new Error("Email verification succeeded without creating a session.");
  return data.session;
}

export async function resendSignupOtp(email: string): Promise<void> {
  const { error } = await getClient().auth.resend({ type: "signup", email: email.trim() });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Returns a user verified by Supabase Auth, not just decoded local session data. */
export async function getAuthenticatedUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await getClient().auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getAccessToken() {
  return (await getSession())?.access_token ?? null;
}

/** The decoded subject is used only to scope query cache keys, never as auth proof. */
export function getSessionUserId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const session = JSON.parse(localStorage.getItem(storageKey) ?? "null") as {
      access_token?: string;
    } | null;
    const token = session?.access_token;
    if (!token || typeof atob === "undefined") return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized)) as { sub?: unknown };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return getClient().auth.onAuthStateChange(callback).data.subscription;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}
