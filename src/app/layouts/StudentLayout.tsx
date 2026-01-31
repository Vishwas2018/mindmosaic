import { Outlet } from 'react-router-dom';
import { AppShell } from '@/shared/ui/AppShell';
import { Header } from '@/shared/ui/Header';
import { Footer } from '@/shared/ui/Footer';
import { Sidebar } from '@/shared/ui/Sidebar';

export function StudentLayout() {
  return (
    <AppShell header={<Header />} sidebar={<Sidebar />} footer={<Footer />}>
      <Outlet />
    </AppShell>
  );
}
