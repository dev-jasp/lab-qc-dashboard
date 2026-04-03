import React from 'react';
import { RouterProvider } from 'react-router-dom';

import { AppImagePreloader } from '@/components/layout/AppImagePreloader';
import { router } from '@/router';
import './index.css'; 

const App: React.FC = () => {
  return (
    <>
      <AppImagePreloader />
      <RouterProvider router={router} />
    </>
  );
};

export default App;
