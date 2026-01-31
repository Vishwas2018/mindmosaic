import { type ReactNode } from "react";
import { type Role } from "@/constants/roles";

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: Role[];
  children: ReactNode;
}) {
  const currentRole: Role = "student"; // placeholder

  if (!allowed.includes(currentRole)) {
    return (
      <div className="p-6 text-brand-textMuted">
        Access denied (placeholder)
      </div>
    );
  }

  return <>{children}</>;
}
