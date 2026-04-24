import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useRouteScrollRestoration } from '@/hooks/useRouteScrollRestoration';
import { getSession } from '@/lib/auth';

export function AppShell() {
  const navigate = useNavigate();
  const hasHandledExpiredSession = useRef(false);

  useRouteScrollRestoration();

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const session = await getSession();

      if (session !== null || hasHandledExpiredSession.current) {
        return;
      }

      hasHandledExpiredSession.current = true;
      toast.error('Your session has expired. Please sign in again.');
      window.setTimeout(() => {
        navigate('/login');
      }, 2000);
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [navigate]);

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
