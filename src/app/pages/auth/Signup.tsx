/**
 * MindMosaic — Signup Page
 *
 * Changes from previous version:
 * - Visual parity with the updated Login page (LogoMark, rounded-2xl cards,
 *   consistent input styles, cleaner error banner)
 * - Ellipsis ("…") used instead of "..." for better typography
 *
 * No auth logic changes.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";

// Shared logo mark — matches Login and StudentLayout
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

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/student", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (success) {
      navigate("/auth/verify-email");
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth loading
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

  if (isAuthenticated && !authLoading) return null;

  // Email-sent confirmation
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-soft px-4 py-12">
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
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-8 text-center">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(22,163,74,0.10)",
                border: "1px solid rgba(22,163,74,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Check your email
            </h1>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-text-primary">{email}</span>.
              Click the link to activate your account.
            </p>
            <Link
              to="/auth/login"
              className="text-sm font-semibold text-primary-blue hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-soft px-4 py-12">
      {/* Brand mark */}
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
              Create an account
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Join MindMosaic to start practising.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
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
                {error}
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
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-text-primary mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              />
              <p className="text-xs text-text-muted mt-1.5">
                At least 8 characters
              </p>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-text-primary mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
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
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="font-semibold text-primary-blue hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
