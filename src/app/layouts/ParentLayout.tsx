/**
 * MindMosaic — Parent Layout
 *
 * Layout for authenticated parent pages
 */

import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function ParentLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Header */}
      <header className="bg-white border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                🧠
              </span>
              <span className="font-semibold text-text-primary">
                MindMosaic
              </span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                Parent
              </span>
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

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
