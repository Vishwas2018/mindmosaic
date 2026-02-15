/**
 * MindMosaic — Auth Callback Page (Day 23)
 *
 * Handles Supabase auth redirect callbacks (email confirmation,
 * password recovery, OAuth). Supabase appends tokens to the URL
 * hash which the JS client automatically processes.
 *
 * This page shows a spinner while the auth state resolves,
 * then redirects the user appropriately.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically processes the URL hash tokens.
        // We just need to check the resulting session.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError.message);
          setError("Authentication failed. Please try again.");
          return;
        }

        if (session) {
          // Fetch profile to determine redirect
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          const role = profile?.role ?? "student";
          navigate(`/${role}`, { replace: true });
        } else {
          // No session — might be email confirmation without auto-login
          navigate("/auth/login", { replace: true });
        }
      } catch {
        setError("Something went wrong. Please try logging in.");
      }
    };

    // Small delay to let Supabase process URL hash
    const timer = setTimeout(handleCallback, 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-text-primary">
            Authentication Error
          </h1>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <a
            href="/auth/login"
            className="mt-6 inline-block rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
        <p className="mt-4 text-sm text-text-muted">
          Completing authentication…
        </p>
      </div>
    </div>
  );
}
