import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ControlMonitor } from '@/pages/ControlMonitor';
import { DiseaseOverview } from '@/pages/DiseaseOverview';
import { DiseaseSelector } from '@/pages/DiseaseSelector';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/monitor" replace /> },
  { path: '/monitor', element: <DiseaseSelector /> },
  { path: '/monitor/:disease', element: <DiseaseOverview /> },
  { path: '/monitor/:disease/:control', element: <ControlMonitor /> },
  { path: '/history', element: <History /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <Navigate to="/monitor" replace /> },
]);
