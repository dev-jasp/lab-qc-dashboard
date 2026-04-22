import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="min-h-screen bg-[#f8fafc] p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
