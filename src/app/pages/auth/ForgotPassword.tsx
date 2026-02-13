/**
 * MindMosaic — Forgot Password Page (Day 23)
 *
 * Sends password reset email using Supabase auth.
 * Redirects authenticated users away.
 */

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

export function ForgotPasswordPage() {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && role) {
    return <Navigate to={`/${role}`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmed = email.trim();
      if (!trimmed) {
        setError("Please enter your email address.");
        setIsSubmitting(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );

      if (resetError) {
        setError("Something went wrong. Please try again.");
        console.error("[ForgotPassword] Error:", resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8">
        <h1 className="text-2xl font-bold text-text-primary">Reset Password</h1>

        {sent ? (
          <div className="mt-6">
            <div className="rounded-lg bg-success-green/10 p-4">
              <p className="text-sm font-medium text-success-green">
                Check your email
              </p>
              <p className="mt-1 text-sm text-text-muted">
                If an account exists for{" "}
                <span className="font-medium">{email}</span>, you'll receive a
                password reset link shortly. Check your spam folder if you don't
                see it.
              </p>
            </div>
            <Link
              to="/login"
              className="mt-6 block text-center text-sm font-medium text-primary-blue hover:underline"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-danger-red/10 p-3">
                <p className="text-sm text-danger-red">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-primary"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-border-subtle px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-blue py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-50"
              >
                {isSubmitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-text-muted">
              Remember your password?{" "}
              <Link
                to="/login"
                className="font-medium text-primary-blue hover:underline"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
