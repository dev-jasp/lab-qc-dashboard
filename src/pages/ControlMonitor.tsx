import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  CONTROL_DEFINITIONS,
  controlTabSlugToType,
  getDiseaseDefinition,
} from "@/constants/monitor-config";
import type { ControlTabSlug } from "@/constants/monitor-config";
import QCDashboard from "@/components/dashboard/QCDashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CONTROL_TABS: { slug: ControlTabSlug; label: string }[] = [
  { slug: "in-house", label: "In-house" },
  { slug: "positive", label: "Positive" },
  { slug: "negative", label: "Negative" },
];

export function ControlMonitor() {
  const navigate = useNavigate();
  const { disease, control } = useParams();

  const diseaseConfig = getDiseaseDefinition(disease);
  const controlTypeSlug = controlTabSlugToType(control ?? "");
  const controlConfig = controlTypeSlug
    ? CONTROL_DEFINITIONS.find((c) => c.slug === controlTypeSlug)
    : undefined;

  if (!diseaseConfig || !controlConfig || !controlTypeSlug) {
    return <Navigate to="/monitor" replace />;
  }

  const tabSlug = control as ControlTabSlug;
  const chartSubtitle = `${controlConfig.label.toUpperCase()} - ${diseaseConfig.name.toUpperCase()}${diseaseConfig.assayTag ? ` - ${diseaseConfig.assayTag}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af]">
            {chartSubtitle}
          </p>
          <h1 className="mt-2 text-[28px] font-bold text-[#111827]">
            {`${diseaseConfig.name} ${controlConfig.label}`}
          </h1>
        </div>

        <Tabs
          value={tabSlug}
          onValueChange={(value) =>
            navigate(`/monitor/${diseaseConfig.slug}/${value}`)
          }
        >
          <TabsList>
            {CONTROL_TABS.map((tab) => (
              <TabsTrigger key={tab.slug} value={tab.slug}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <QCDashboard
        key={`${diseaseConfig.slug}-${controlTypeSlug}`}
        diseaseSlug={diseaseConfig.slug}
        controlType={controlTypeSlug}
        controlTabSlug={tabSlug}
      />
    </div>
  );
}
