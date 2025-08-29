import React from 'react';

const DashboardHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">
        Quality Control Dashboard
      </h1>
      <p className="text-gray-600">
        Levey-Jennings Chart for OD Measurements
      </p>
    </div>
  );
};

export default DashboardHeader;