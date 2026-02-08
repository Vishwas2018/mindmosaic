/**
 * MindMosaic — Supabase Client (FIXED)
 *
 * Single, shared Supabase client for frontend.
 * Enhanced with better error handling and validation.
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced logging for debugging
console.log("=== Supabase Client Initialization ===");
console.log("URL:", supabaseUrl);
console.log("Anon key length:", supabaseAnonKey?.length);
console.log("Anon key prefix:", supabaseAnonKey?.substring(0, 20) + "...");
console.log("Environment mode:", import.meta.env.MODE);

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not set. Check your .env.local file.");
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is not set. Check your .env.local file.",
  );
}

// Validate URL format
if (!supabaseUrl.startsWith("https://")) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format: ${supabaseUrl}. Must start with https://`,
  );
}

// Validate anon key format (should be a JWT)
if (!supabaseAnonKey.startsWith("eyJ")) {
  throw new Error(
    "Invalid VITE_SUPABASE_ANON_KEY format. Should be a JWT token starting with 'eyJ'",
  );
}

// Expected length for Supabase anon keys (approximate)
if (supabaseAnonKey.length < 150 || supabaseAnonKey.length > 250) {
  console.warn(
    `Warning: Anon key length (${supabaseAnonKey.length}) is unusual. Expected ~200 characters.`,
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    headers: {
      "x-client-info": "mindmosaic-web-app",
    },
  },
});

console.log("✓ Supabase client created successfully");

/**
 * Edge Function caller helper
 * Uses the current session's access token for authorization
 */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[callEdgeFunction] Session error:", sessionError);
      return { data: null, error: sessionError.message, status: 401 };
    }

    if (!session) {
      console.warn("[callEdgeFunction] No active session");
      return { data: null, error: "Not authenticated", status: 401 };
    }

    console.log(`[callEdgeFunction] Calling ${functionName}...`);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`[callEdgeFunction] ${functionName} failed:`, {
        status: response.status,
        error: data.error || data.message,
      });

      return {
        data: null,
        error:
          data.error ||
          data.message ||
          `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    console.log(`[callEdgeFunction] ${functionName} succeeded`);
    return { data: data as T, error: null, status: response.status };
  } catch (err: any) {
    console.error(`[callEdgeFunction] ${functionName} exception:`, err);
    return {
      data: null,
      error: err.message || "Unknown error",
      status: 500,
    };
  }
}
