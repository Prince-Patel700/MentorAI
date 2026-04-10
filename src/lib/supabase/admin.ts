import { createClient } from "@supabase/supabase-js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function fetchWithRetry(
  url: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Admin Supabase client using the service_role key.
 * Bypasses RLS — use only in server-side code (tRPC routers, API routes).
 *
 * Note: The Database generic is intentionally omitted to avoid `never` types
 * on relation joins (our manual types don't define Relationships yet).
 * Regenerate types with `npm run db:types` after schema changes for full safety.
 */
let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Lazily initialised admin client — evaluated at request time, not build time.
 */
export function getSupabaseAdmin() {
  if (_adminClient) return _adminClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "https://placeholder.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "placeholder";

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithRetry,
    },
  });

  return _adminClient;
}

/** @deprecated Use getSupabaseAdmin() instead */
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabaseAdmin() as Record<string | symbol, unknown>)[prop];
  },
});
