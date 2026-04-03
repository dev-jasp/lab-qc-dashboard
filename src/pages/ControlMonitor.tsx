import { Navigate, useParams } from 'react-router-dom';

import QCDashboard from '@/components/dashboard/QCDashboard';
import {
  getControlDefinition,
  getControlMonitorSeed,
  getDiseaseDefinition,
} from '@/constants/monitor-config';

export function ControlMonitor() {
  const { disease, control } = useParams();

  const diseaseConfig = getDiseaseDefinition(disease);
  const controlConfig = getControlDefinition(control);

  if (!diseaseConfig || !controlConfig) {
    return <Navigate to="/monitor" replace />;
  }

  const monitorSeed = getControlMonitorSeed(diseaseConfig.slug, controlConfig.slug);

  return (
    <QCDashboard
      key={`${diseaseConfig.slug}-${controlConfig.slug}`}
      diseaseName={diseaseConfig.name}
      controlName={controlConfig.label}
      assayTag={diseaseConfig.assayTag}
      initialData={monitorSeed.data}
      initialParameters={monitorSeed.parameters}
    />
  );
}

