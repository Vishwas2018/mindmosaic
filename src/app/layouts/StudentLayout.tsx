/**
 * MindMosaic — Student Layout
 *
 * Layout for authenticated student pages
 * Includes navigation sidebar and header
 */

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function StudentLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Header */}
      <header className="bg-white border-b border-border-subtle sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span className="font-semibold text-text-primary">MindMosaic</span>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-text-muted hover:text-primary-blue transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <nav className="hidden md:block w-48 shrink-0">
            <ul className="space-y-1">
              <NavItem to="/student" end>
                🏠 Dashboard
              </NavItem>
              <NavItem to="/student/exams">
                📝 Practice Exams
              </NavItem>
              <NavItem to="/student/progress" disabled>
                📊 My Progress
              </NavItem>
            </ul>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-subtle z-20">
        <div className="flex justify-around py-2">
          <MobileNavItem to="/student" end icon="🏠" label="Home" />
          <MobileNavItem to="/student/exams" icon="📝" label="Exams" />
          <MobileNavItem to="/student/progress" icon="📊" label="Progress" disabled />
        </div>
      </nav>
    </div>
  );
}

// =============================================================================
// Navigation Components
// =============================================================================

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  end?: boolean;
  disabled?: boolean;
}

function NavItem({ to, children, end, disabled }: NavItemProps) {
  if (disabled) {
    return (
      <li>
        <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted opacity-50 cursor-not-allowed">
          {children}
        </span>
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? "bg-primary-blue/10 text-primary-blue font-medium"
              : "text-text-muted hover:bg-gray-100"
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  );
}

interface MobileNavItemProps {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
  disabled?: boolean;
}

function MobileNavItem({ to, icon, label, end, disabled }: MobileNavItemProps) {
  if (disabled) {
    return (
      <span className="flex flex-col items-center gap-1 px-4 py-1 text-text-muted opacity-50">
        <span className="text-xl">{icon}</span>
        <span className="text-xs">{label}</span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-1 ${
          isActive ? "text-primary-blue" : "text-text-muted"
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </NavLink>
  );
}
