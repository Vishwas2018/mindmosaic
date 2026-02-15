/**
 * MindMosaic — Role Guard
 *
 * Protects routes based on user role.
 * Uses real role from profiles table via AuthContext.
 *
 * No hardcoded roles. No placeholder values.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/database.types";
import type { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  /** Roles allowed to access this route */
  allowed: UserRole[];
  /** Where to redirect unauthorized users. Defaults to role-appropriate dashboard */
  redirectTo?: string;
}

/**
 * Get the default dashboard route for a given role
 */
function getDashboardForRole(role: UserRole | null): string {
  switch (role) {
    case "student":
      return "/student";
    case "parent":
      return "/parent";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export function RoleGuard({ children, allowed, redirectTo }: RoleGuardProps) {
  const { role, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading state while fetching role
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, AuthGuard should handle this
  // But add a safety check
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if user's role is in allowed list
  if (role && allowed.includes(role)) {
    return <>{children}</>;
  }

  // User has a role but it's not allowed
  // Redirect to their appropriate dashboard or specified redirect
  const destination = redirectTo ?? getDashboardForRole(role);

  return <Navigate to={destination} replace />;
}

// =============================================================================
// Convenience Guards
// =============================================================================

interface SimpleGuardProps {
  children: ReactNode;
}

export function StudentGuard({ children }: SimpleGuardProps) {
  return <RoleGuard allowed={["student"]}>{children}</RoleGuard>;
}

export function ParentGuard({ children }: SimpleGuardProps) {
  return <RoleGuard allowed={["parent"]}>{children}</RoleGuard>;
}

export function AdminGuard({ children }: SimpleGuardProps) {
  return <RoleGuard allowed={["admin"]}>{children}</RoleGuard>;
}
