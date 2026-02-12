/**
 * MindMosaic — Auth Layout
 *
 * Layout for authentication pages (login, signup)
 */

import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function AuthLayout() {
  const { isAuthenticated, role, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to appropriate dashboard if already authenticated
  if (isAuthenticated && role) {
    return <Navigate to={`/${role}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background-soft">
      <Outlet />
    </div>
  );
}
