import { Outlet } from 'react-router-dom';
import { Shell } from '../../shared/ui/Shell';

export function StudentLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
