import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ControlMonitor } from '@/pages/ControlMonitor';
import { DiseaseOverview } from '@/pages/DiseaseOverview';
import { DiseaseSelector } from '@/pages/DiseaseSelector';
import { History } from '@/pages/History';
import LoginPage from '@/pages/LoginPage';
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
      { path: '/history', element: <History /> },
      { path: '/violations', element: <Violations /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/monitor" replace /> },
]);
