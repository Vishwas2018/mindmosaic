export const ROLES = {
  STUDENT: "student",
  PARENT: "parent",
  ADMIN: "admin",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
