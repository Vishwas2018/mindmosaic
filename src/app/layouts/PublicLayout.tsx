import { Outlet } from 'react-router-dom';
import { Shell } from '../../shared/ui/Shell';

export function PublicLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
