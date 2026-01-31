import { Outlet } from 'react-router-dom';
import { Shell } from '../../shared/ui/Shell';

export function AuthLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
