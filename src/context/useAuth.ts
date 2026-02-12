import { useContext } from "react";
import type { UserRole } from "../lib/database.types";
import { AuthContext } from "../context/auth-context";
import type { AuthContextValue } from "../context/auth-context";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { role } = useAuth();
  return role !== null && allowedRoles.includes(role);
}
