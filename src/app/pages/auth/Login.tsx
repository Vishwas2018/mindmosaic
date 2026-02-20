/**
 * MindMosaic — Login Page
 *
 * Changes from previous version:
 * - Added LogoMark + brand name above the form card
 * - Fixed link layout: "Sign up" and "Forgot password?" are now on
 *   separate lines so they don't run together
 * - Test-accounts panel is gated to development builds only
 *   (import.meta.env.DEV) — not shown in production
 * - Minor input/button spacing polish
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";

// Inline logo mark — matches StudentLayout, no external dependency
function LogoMark() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 16px rgba(37, 99, 235, 0.30)",
        flexShrink: 0,
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
      </svg>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, role, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleHydrationError =
    !authLoading && isAuthenticated && !role
      ? "Signed in, but no profile role was found for this account. Contact your administrator."
      : null;
  const displayError = error ?? roleHydrationError;

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && role && !authLoading) {
      const from = (location.state as { from?: { pathname?: string } })?.from
        ?.pathname;
      const rolePaths: Record<string, string> = {
        admin: "/admin",
        student: "/student",
        parent: "/parent",
      };
      const targetPath = from || rolePaths[role] || "/student";
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, role, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: signInError } = await signIn(normalizedEmail, password);

      if (signInError) {
        let message = signInError.message;
        if (message.includes("Invalid login credentials")) {
          message = "Invalid email or password. Please check your details.";
        } else if (message.includes("Email not confirmed")) {
          message = "Please confirm your email address before signing in.";
        }
        setError(message);
        setIsSubmitting(false);
        return;
      }
      // Success — redirect handled by the useEffect above once role loads.
      setIsSubmitting(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  // Loading state during auth initialisation
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Initialising…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-soft px-4 py-12">
      {/* Brand mark above the card */}
      <div className="flex items-center gap-3 mb-8">
        <LogoMark />
        <span
          style={{
            fontWeight: 900,
            fontSize: 20,
            color: "#0f172a",
            letterSpacing: "-0.01em",
          }}
        >
          MindMosaic
        </span>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-8">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-xl font-bold text-text-primary">
              Sign in to your account
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Welcome back — enter your details below.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error banner */}
            {displayError && (
              <div
                className="rounded-xl px-4 py-3 text-sm border"
                style={{
                  background: "rgba(220,38,38,0.06)",
                  borderColor: "rgba(220,38,38,0.20)",
                  color: "#b91c1c",
                  fontWeight: 600,
                }}
                role="alert"
              >
                {displayError}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-text-primary mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-text-primary"
                >
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-medium text-primary-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-primary-blue text-white rounded-xl font-semibold text-sm hover:bg-primary-blue-light focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Sign-up link — on its own line to avoid concatenation with Forgot */}
          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/signup"
              className="font-semibold text-primary-blue hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Test accounts — only shown during local development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-200">
            <p className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">
              Dev — Test Accounts
            </p>
            <div className="text-xs text-gray-500 font-mono space-y-1">
              <p>
                <span className="font-semibold text-gray-700">Student:</span>{" "}
                student@test.com
              </p>
              <p>
                <span className="font-semibold text-gray-700">Parent:</span>{" "}
                parent@test.com
              </p>
              <p>
                <span className="font-semibold text-gray-700">Admin:</span>{" "}
                admin@test.com
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Create these users in Supabase Auth first
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
