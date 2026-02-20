/**
 * MindMosaic — Student Layout (Premium Upgrade)
 *
 * Changes from previous version:
 * - Replaced emoji nav icons with clean inline SVG icons
 * - Added geometric LogoMark (no external icon dependency)
 * - Added UserAvatar with initial derived from email
 * - Removed disabled/greyed-out "My Progress" nav item (was confusing;
 *   the feature does not exist yet — better to omit than to tease it)
 * - Sticky sidebar that scrolls with the viewport
 * - Mobile bottom nav uses the same SVG icons
 *
 * No routing, auth, or data-fetching changes.
 */

import { type ReactNode } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// =============================================================================
// Icon components — small inline SVGs, no external dependency
// =============================================================================

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

// Geometric hexagon logo mark — rendered from SVG, no images needed
function LogoMark() {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.28)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
      </svg>
    </div>
  );
}

// User avatar — shows first initial of email handle
function UserAvatar({ email }: { email: string }) {
  const initial = (email[0] ?? "U").toUpperCase();
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(20,184,166,0.10))",
        border: "1.5px solid rgba(37, 99, 235, 0.22)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 13,
        color: "#2563eb",
        flexShrink: 0,
        fontFamily: "inherit",
      }}
    >
      {initial}
    </div>
  );
}

// =============================================================================
// StudentLayout
// =============================================================================

export function StudentLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const displayName = email.split("@")[0] ?? "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background-soft">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[15px] font-extrabold text-text-primary tracking-tight hidden sm:block">
                MindMosaic
              </span>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-3">
              {email && (
                <div className="hidden sm:flex items-center gap-2">
                  <UserAvatar email={email} />
                  <span className="text-sm font-medium text-text-muted max-w-[160px] truncate">
                    {displayName}
                  </span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 focus-ring"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-10">
        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <nav
            className="hidden md:block w-52 shrink-0"
            aria-label="Main navigation"
          >
            <div className="sticky top-24">
              <ul className="space-y-0.5" role="list">
                <SidebarItem to="/student" end icon={<HomeIcon />}>
                  Dashboard
                </SidebarItem>
                <SidebarItem to="/student/exams" icon={<BookIcon />}>
                  Practice Exams
                </SidebarItem>
              </ul>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border-subtle safe-area-pb"
        aria-label="Mobile navigation"
      >
        <div className="flex justify-around py-1">
          <BottomNavItem to="/student" end icon={<HomeIcon />} label="Home" />
          <BottomNavItem
            to="/student/exams"
            icon={<BookIcon />}
            label="Exams"
          />
        </div>
      </nav>
    </div>
  );
}

// =============================================================================
// Sidebar nav item
// =============================================================================

interface SidebarItemProps {
  to: string;
  children: ReactNode;
  icon: ReactNode;
  end?: boolean;
}

function SidebarItem({ to, children, icon, end }: SidebarItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            isActive
              ? "bg-primary-blue/10 text-primary-blue font-semibold"
              : "text-text-muted font-medium hover:bg-gray-100 hover:text-text-primary"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              style={{ color: isActive ? "#2563eb" : "currentColor" }}
              aria-hidden="true"
            >
              {icon}
            </span>
            {children}
          </>
        )}
      </NavLink>
    </li>
  );
}

// =============================================================================
// Mobile bottom nav item
// =============================================================================

interface BottomNavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}

function BottomNavItem({ to, icon, label, end }: BottomNavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-6 py-2 text-xs font-medium transition-colors ${
          isActive ? "text-primary-blue" : "text-text-muted"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
