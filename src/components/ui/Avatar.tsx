/**
 * MindMosaic — Avatar Component
 *
 * Displays user initials in a colored circle.
 * Color is derived deterministically from the name.
 *
 * Usage:
 *   <Avatar name="Vishwas Joshi" />
 *   <Avatar name="student@test.com" size="lg" />
 *   <Avatar name="" fallback="?" />
 */

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  /** User's name or email — used for initials and color */
  name: string;
  /** Visual size */
  size?: AvatarSize;
  /** Fallback character when name is empty */
  fallback?: string;
  /** Additional classes */
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

// Warm, accessible pastel palette that works on white backgrounds
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

function getInitials(name: string): string {
  if (!name) return "";

  // If it's an email, use the part before @
  const displayName = name.includes("@") ? name.split("@")[0] : name;

  const parts = displayName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/);

  if (parts.length === 0 || !parts[0]) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

export function Avatar({
  name,
  size = "md",
  fallback = "?",
  className = "",
}: AvatarProps) {
  const initials = getInitials(name) || fallback;
  const colorClass = AVATAR_COLORS[getColorIndex(name)];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${colorClass} ${className}`}
      role="img"
      aria-label={name ? `Avatar for ${name}` : "User avatar"}
    >
      {initials}
    </div>
  );
}
