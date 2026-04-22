import React from 'react';
import { RouterProvider } from 'react-router-dom';

import { AppImagePreloader } from '@/components/layout/AppImagePreloader';
import { Toaster } from '@/components/ui/sonner';
import { router } from '@/router';

const App: React.FC = () => {
  return (
    <>
      <AppImagePreloader />
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
};

export default App;
