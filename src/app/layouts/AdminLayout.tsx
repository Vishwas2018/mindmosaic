import { Outlet } from 'react-router-dom';
import { Shell } from '../../shared/ui/Shell';

export function AdminLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
