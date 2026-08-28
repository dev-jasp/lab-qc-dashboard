import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Analytics } from '@/pages/Analytics';
import { ControlMonitor } from '@/pages/ControlMonitor';
import { DiseaseOverview } from '@/pages/DiseaseOverview';
import { DiseaseSelector } from '@/pages/DiseaseSelector';
import { Help } from '@/pages/Help';
import { History } from '@/pages/History';
import LoginPage from '@/pages/LoginPage';
import { Lots } from '@/pages/Lots';
import { Personnel } from '@/pages/Personnel';
import { Reports } from '@/pages/Reports';
import { StaffProfile } from '@/pages/StaffProfile';
import { Settings } from '@/pages/Settings';
import { Violations } from '@/pages/Violations';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/monitor" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Navigate to="/monitor" replace />
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: '/monitor', element: <DiseaseSelector /> },
      { path: '/monitor/:disease', element: <DiseaseOverview /> },
      { path: '/monitor/:disease/:control', element: <ControlMonitor /> },
      { path: '/reports', element: <Reports /> },
      // Kept so links to the page's original path still resolve.
      { path: '/exports', element: <Navigate to="/reports" replace /> },
      { path: '/lots', element: <Lots /> },
      { path: '/personnel', element: <Personnel /> },
      { path: '/personnel/:staffId', element: <StaffProfile /> },
      { path: '/help', element: <Help /> },
      { path: '/history', element: <History /> },
      { path: '/violations', element: <Violations /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/monitor" replace /> },
]);
