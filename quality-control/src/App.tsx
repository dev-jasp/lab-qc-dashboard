import React from 'react';
import QCDashboard from './components/dashboard/QCDashboard';
import './index.css'; // Make sure Tailwind CSS is imported

const App: React.FC = () => {
  return (
    <div className="App">
      <QCDashboard />
    </div>
  );
};

export default App;