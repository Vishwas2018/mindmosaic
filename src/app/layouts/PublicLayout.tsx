import { Outlet } from 'react-router-dom';
import { AppShell } from '@/shared/ui/AppShell';
import { Header } from '@/shared/ui/Header';
import { Footer } from '@/shared/ui/Footer';

export function PublicLayout() {
  return (
    <AppShell header={<Header />} footer={<Footer />}>
      <Outlet />
    </AppShell>
  );
}
