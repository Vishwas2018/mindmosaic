/**
 * MindMosaic — Reset Password Page (Day 23)
 *
 * Handles the password reset flow after user clicks the email link.
 * Supabase automatically exchanges the token in the URL hash on page load.
 * This page lets the user set a new password.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Check if we have a valid recovery session from the email link
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();

    // Listen for PASWORD_RECOVERY event from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(
          "Failed to update password. The link may have expired. Please request a new one.",
        );
        console.error("[ResetPassword] Error:", updateError.message);
      } else {
        setSuccess(true);
        // Redirect to login after brief delay
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Still checking session
  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
      </div>
    );
  }

  // No valid session — invalid or expired link
  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            Invalid or Expired Link
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            This password reset link is no longer valid. It may have expired or
            already been used.
          </p>
          <Link
            to="/auth/forgot-password"
            className="mt-6 inline-block rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Set New Password
        </h1>

        {success ? (
          <div className="mt-6">
            <div className="rounded-lg bg-success-green/10 p-4">
              <p className="text-sm font-medium text-success-green">
                Password updated successfully
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Redirecting you to login…
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Enter your new password below.
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-danger-red/10 p-3">
                <p className="text-sm text-danger-red">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-primary"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-border-subtle px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-text-primary"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-border-subtle px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-blue py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-50"
              >
                {isSubmitting ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
