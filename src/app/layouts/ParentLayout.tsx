import { Outlet } from 'react-router-dom';
import { Shell } from '../../shared/ui/Shell';

export function ParentLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
