/**
 * MindMosaic — Login Page (Tailwind Only)
 *
 * Uses only Tailwind utility classes for styling.
 * Custom colors defined in index.css @theme block.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, role, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && role && !authLoading) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
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
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        // User-friendly error messages
        let message = signInError.message;
        if (message.includes("Invalid login credentials")) {
          message = "Invalid email or password. Please check your credentials.";
        } else if (message.includes("Email not confirmed")) {
          message = "Please confirm your email before signing in.";
        }
        setError(message);
        setIsSubmitting(false);
        return;
      }
      // Success - redirect handled by useEffect
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setIsSubmitting(false);
    }
  };

  // Loading state during auth initialization
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Initializing...</p>
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
              Welcome back
            </h1>
            <p className="text-text-muted mt-1">
              Sign in to continue to MindMosaic
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
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-primary-blue text-white rounded-lg font-medium hover:bg-primary-blue-light focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary-blue hover:underline">
              Sign up
            </Link>
          </div>

          {/* Test Accounts Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-text-muted mb-2">
              Test Accounts:
            </p>
            <div className="text-xs text-gray-600 font-mono space-y-1">
              <p><span className="font-semibold">Student:</span> student@test.com</p>
              <p><span className="font-semibold">Parent:</span> parent@test.com</p>
              <p><span className="font-semibold">Admin:</span> admin@test.com</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Create users in Supabase Auth first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
