import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useRouteScrollRestoration } from '@/hooks/useRouteScrollRestoration';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppShell() {
  useRouteScrollRestoration();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="min-h-[calc(100vh-3.5rem)] bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
