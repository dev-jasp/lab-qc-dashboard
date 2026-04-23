import { Navigate, useParams } from "react-router-dom";

import QCDashboard from "@/components/dashboard/QCDashboard";
import {
  getControlDefinition,
  getDiseaseDefinition,
} from "@/constants/monitor-config";

export function ControlMonitor() {
  const { disease, control } = useParams();

  const diseaseConfig = getDiseaseDefinition(disease);
  const controlConfig = getControlDefinition(control);

  if (!diseaseConfig || !controlConfig) {
    return <Navigate to="/monitor" replace />;
  }

  return (
    <QCDashboard
      key={`${diseaseConfig.slug}-${controlConfig.slug}`}
      diseaseSlug={diseaseConfig.slug}
      controlType={controlConfig.slug}
      diseaseName={diseaseConfig.name}
      controlName={controlConfig.label}
      assayTag={diseaseConfig.assayTag}
    />
  );
}
