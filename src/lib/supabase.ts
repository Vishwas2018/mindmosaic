/**
 * MindMosaic — Supabase Client
 *
 * Single, shared Supabase client for frontend.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables at startup
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file:\n" +
    "VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
    "VITE_SUPABASE_ANON_KEY=your-anon-key"
  );
}

if (!supabaseUrl.startsWith("https://")) {
  throw new Error("VITE_SUPABASE_URL must start with https://");
}

if (!supabaseAnonKey.startsWith("eyJ")) {
  throw new Error("VITE_SUPABASE_ANON_KEY must be a valid JWT");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

/**
 * Call a Supabase Edge Function with authentication
 */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { data: null, error: "Not authenticated", status: 401 };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || data.message || `Request failed (${response.status})`,
        status: response.status,
      };
    }

    return { data: data as T, error: null, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { data: null, error: message, status: 500 };
  }
}
