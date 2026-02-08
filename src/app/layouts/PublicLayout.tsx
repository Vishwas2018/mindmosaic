/**
 * MindMosaic — Public Layout
 *
 * Layout for public (unauthenticated) pages
 */

import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background-soft">
      <Outlet />
    </div>
  );
}
