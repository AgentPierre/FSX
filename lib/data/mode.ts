// Explicit fixture mode is for local UI work only. Never fall back silently on a database error.
export function usingStub(): boolean {
  const mode = process.env.FSX_DATA_SOURCE ?? "supabase";
  if (mode !== "supabase" && mode !== "stub") {
    throw new Error("FSX_DATA_SOURCE must be supabase or stub.");
  }
  if (mode === "stub" && process.env.NODE_ENV === "production") {
    throw new Error("Stub data is disabled in production.");
  }
  return mode === "stub";
}
