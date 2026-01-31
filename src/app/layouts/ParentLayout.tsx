import { Outlet } from 'react-router-dom';
import { AppShell } from '@/shared/ui/AppShell';
import { Header } from '@/shared/ui/Header';
import { Footer } from '@/shared/ui/Footer';
import { Sidebar } from '@/shared/ui/Sidebar';
import { AuthGuard } from '@/guards/AuthGuard';
import { RoleGuard } from '@/guards/RoleGuard';

export function ParentLayout() {
  return (
    <AppShell header={<Header />} sidebar={<Sidebar />} footer={<Footer />}>
      <AuthGuard>
        <RoleGuard allowed={["parent"]}>
          <Outlet />
        </RoleGuard>
      </AuthGuard>
    </AppShell>
  );
}
