import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

/**
 * Client-side Supabase instance for browser usage (Realtime, auth relay).
 * Lazily initialized — safe to import server-side but only call in browser.
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
  }
  return _client;
}

/**
 * Server-side Supabase instance for API routes / Server Actions.
 * Creates a fresh client per request (no singleton needed server-side).
 */
export function getSupabaseServer() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
