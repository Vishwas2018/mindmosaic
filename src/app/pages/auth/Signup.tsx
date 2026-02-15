/**
 * MindMosaic — Signup Page (Tailwind Only)
 *
 * Uses only Tailwind utility classes for styling.
 * Custom colors defined in index.css @theme block.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { useEffect } from "react";

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated && !authLoading) {
    navigate("/student", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
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
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect after success
  useEffect(() => {
    if (success) {
      navigate("/auth/verify-email");
    }
  }, [success, navigate]);

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-border-subtle p-8 text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h1 className="text-2xl font-semibold text-text-primary mb-2">
              Check your email
            </h1>
            <p className="text-text-muted mb-6">
              We've sent a confirmation link to{" "}
              <span className="font-medium text-text-primary">{email}</span>
            </p>
            <Link
              to="/auth/login"
              className="text-primary-blue hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-border-subtle p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-text-primary">
              Create an account
            </h1>
            <p className="text-text-muted mt-1">
              Join MindMosaic to start practicing
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 text-danger-red text-sm rounded-lg p-3 border border-red-200">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary mb-1"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary mb-1"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-text-muted mt-1">
                At least 8 characters
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-primary mb-1"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button - VISIBLE with proper Tailwind classes */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-primary-blue text-white rounded-lg font-medium hover:bg-primary-blue-light focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-blue hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
