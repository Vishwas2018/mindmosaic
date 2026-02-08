/**
 * MindMosaic — Login Page (VERIFIED PATHS)
 *
 * File location: src/app/pages/auth/Login.tsx
 * AuthContext location: src/context/AuthContext.tsx
 * Import path: ../../../context/AuthContext ✅
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, role, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && role && !authLoading) {
      console.log("[LoginPage] User authenticated with role:", role);

      // Determine redirect path based on role
      const from = (location.state as { from?: { pathname?: string } })?.from
        ?.pathname;

      // Map role to dashboard path
      const rolePaths: Record<string, string> = {
        admin: "/admin",
        student: "/student",
        parent: "/parent",
      };

      const defaultPath = rolePaths[role] || "/student";
      const targetPath = from || defaultPath;

      console.log("[LoginPage] Redirecting to:", targetPath);

      // Use replace to avoid back button issues
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, role, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    console.log("[LoginPage] Attempting login with:", email);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        console.error("[LoginPage] Login failed:", signInError.message);
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      console.log("[LoginPage] Sign in successful, waiting for redirect...");
      // Keep isSubmitting true - component will unmount on redirect
    } catch (err: any) {
      console.error("[LoginPage] Login exception:", err);
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  // Show loading during auth initialization
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
            style={{ color: "#3b82f6" }}
            role="status"
          >
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-4" style={{ color: "#6b7280" }}>
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#f8f9fa" }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-xl shadow-sm border p-8"
          style={{
            backgroundColor: "white",
            borderColor: "#e5e7eb",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold" style={{ color: "#1f2937" }}>
              Welcome back
            </h1>
            <p className="mt-1" style={{ color: "#6b7280" }}>
              Sign in to continue to MindMosaic
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="text-sm rounded-lg p-3"
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: "#1f2937" }}
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
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: "#1f2937" }}
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
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                backgroundColor: isSubmitting ? "#93c5fd" : "#3b82f6",
                color: "white",
                borderRadius: "0.5rem",
                fontWeight: 500,
                border: "none",
                cursor: isSubmitting ? "wait" : "pointer",
                fontSize: "1rem",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Test Credentials Helper */}
          <div
            className="mt-6 p-4 rounded-lg text-xs"
            style={{
              backgroundColor: "#f3f4f6",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ color: "#6b7280", marginBottom: "0.5rem" }}>
              <strong>Test Accounts:</strong>
            </div>
            <div
              style={{
                color: "#4b5563",
                fontFamily: "monospace",
                fontSize: "0.7rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Admin:</strong> jvishu21@gmail.com
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Student:</strong> student@test.com
              </div>
              <div>
                <strong>Parent:</strong> parent@test.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
