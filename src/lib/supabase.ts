/** Small Supabase Auth client; session refresh is kept explicit to avoid an SDK dependency. */
const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
const storageKey = "pst.supabase.session";

export type AuthSession = { access_token: string; refresh_token: string; expires_at?: number };
type AuthResponse = Partial<AuthSession> & { message?: string; error_description?: string };
export type SignupProfile = {
  fullName: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  institution?: string;
  studyYear?: string;
  learningGoal?: string;
};

function configured() {
  if (!url || !anonKey)
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.");
}

function save(session: AuthResponse) {
  if (session.access_token && session.refresh_token)
    localStorage.setItem(storageKey, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    }));
}

function stored(): AuthSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const session = JSON.parse(localStorage.getItem(storageKey) ?? "null") as AuthSession | null;
    return session?.access_token && session.refresh_token ? session : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

async function auth(path: string, body: unknown): Promise<AuthResponse> {
  configured();
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AuthResponse;
  if (!res.ok) throw new Error(data.error_description ?? data.message ?? "Authentication failed.");
  save(data);
  return data;
}

export const signIn = (email: string, password: string) => auth("token?grant_type=password", { email, password });
export const signUp = (email: string, password: string, profile: SignupProfile) =>
  auth("signup", {
    email,
    password,
    data: {
      full_name: profile.fullName,
      level: profile.level,
      institution: profile.institution || null,
      study_year: profile.studyYear || null,
      learning_goal: profile.learningGoal || null,
    },
  });

export const verifySignupOtp = (email: string, token: string) =>
  auth("verify", { type: "signup", email, token });

export async function getSession(): Promise<AuthSession | null> {
  const session = stored();
  if (!session) return null;
  if (!session.expires_at || session.expires_at * 1000 > Date.now() + 60_000) return session;
  try {
    const refreshed = await auth("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    return refreshed.access_token && refreshed.refresh_token ? refreshed as AuthSession : null;
  } catch {
    signOut();
    return null;
  }
}

export async function getAccessToken() {
  return (await getSession())?.access_token ?? null;
}

export function signOut() {
  const token = stored()?.access_token;
  if (typeof localStorage !== "undefined") localStorage.removeItem(storageKey);
  if (token && url && anonKey)
    void fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
}
