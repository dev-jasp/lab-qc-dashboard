import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router-dom';

import LeveyJenningsChart from '@/components/chart/LeveyJenningsChart';
import { getDiseaseControls, getDiseaseDefinition } from '@/constants/monitor-config';
import { ensureControlDatasetInitialized, entriesToChartData, getControlParameters } from '@/lib/qcMonitor';
import { getEntries, getLots } from '@/lib/qcStorage';
import type { ChartDataPoint, ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';
import { calculateStatistics } from '@/utils/qc-calculations';

const toneLabel = {
  normal: 'In control',
  warning: 'Watchlist',
  critical: 'Out of bounds',
} as const;

type OverviewControlSummary = ReturnType<typeof getDiseaseControls>[number] & {
  activeLotNumber: string | null;
  lotStartDate: string | null;
  activeRuns: number;
  data: ChartDataPoint[];
};

async function buildControlSummary(
  disease: DiseaseSlug,
  control: ReturnType<typeof getDiseaseControls>[number],
): Promise<OverviewControlSummary> {
  await ensureControlDatasetInitialized(disease, control.slug);

  if (control.slug === 'in-house-control') {
    const entries = await getEntries(disease, control.slug);

    return {
      ...control,
      parameters: getControlParameters(disease, control.slug),
      data: entriesToChartData(entries),
      activeLotNumber: 'Continuous dataset',
      lotStartDate: entries[0]?.date ?? null,
      activeRuns: entries.length,
    };
  }

  const lots = await getLots(disease, control.slug);
  const activeLot = lots.find((lot) => lot.status === 'active') ?? lots[0] ?? null;
  const entries = activeLot ? await getEntries(disease, control.slug, activeLot.lotNumber) : [];

  return {
    ...control,
    parameters: getControlParameters(disease, control.slug as ControlTypeSlug),
    data: entriesToChartData(entries),
    activeLotNumber: activeLot?.lotNumber ?? null,
    lotStartDate: activeLot?.startDate ?? null,
    activeRuns: entries.length,
  };
}

export function DiseaseOverview() {
  const { disease } = useParams();
  const diseaseConfig = getDiseaseDefinition(disease);
  const [controls, setControls] = useState<OverviewControlSummary[]>([]);

  useEffect(() => {
    if (!diseaseConfig) {
      return;
    }

    let isCancelled = false;

    const loadOverview = async () => {
      const seededControls = getDiseaseControls(diseaseConfig.slug);
      const nextControls = await Promise.all(
        seededControls.map((control) => buildControlSummary(diseaseConfig.slug, control)),
      );

      if (!isCancelled) {
        setControls(nextControls);
      }
    };

    void loadOverview();

    return () => {
      isCancelled = true;
    };
  }, [diseaseConfig]);

  const warningCount = useMemo(
    () => controls.filter((control) => control.tone === 'warning').length,
    [controls],
  );
  const criticalCount = useMemo(
    () => controls.filter((control) => control.tone === 'critical').length,
    [controls],
  );
  const latestTimestamp = useMemo(
    () =>
      controls
        .flatMap((control) => control.data.map((point) => point.timestamp))
        .sort()
        .at(-1),
    [controls],
  );

  if (!diseaseConfig) {
    return (
      <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-[#1A1C1C]">Disease Not Found</h1>
        <p className="mt-3 text-sm text-[#64748B]">
          The requested surveillance area does not exist in the current QC configuration.
        </p>
        <Link to="/monitor" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#0000FF]">
          <ArrowLeftIcon size={16} />
          Back to monitor
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/monitor" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#64748B]">
          <ArrowLeftIcon size={16} />
          Back to disease selector
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0000FF]">Disease Overview</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#111827]">{diseaseConfig.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-[#64748B]">{diseaseConfig.summary}</p>
          </div>

          <div className="inline-flex items-center rounded-full bg-[rgba(0,0,255,0.08)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0000FF]">
            {diseaseConfig.assayTag}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-xl border border-[#F3F3F3] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Controls</p>
            <p className="mt-1 text-lg font-bold text-[#111827]">{controls.length || 3} active</p>
          </div>
          <div className="rounded-xl border border-[#F3F3F3] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">QC Status</p>
            <p
              className="mt-1 text-lg font-bold"
              style={{ color: criticalCount > 0 ? '#991B1B' : warningCount > 0 ? '#B45309' : '#0F766E' }}
            >
              {criticalCount > 0 ? `${criticalCount} action required` : warningCount > 0 ? `${warningCount} watchlist` : 'All stable'}
            </p>
          </div>
          <div className="rounded-xl border border-[#F3F3F3] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Last Updated</p>
            <p className="mt-1 text-lg font-bold text-[#111827]">{latestTimestamp ?? 'No runs'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {controls.map((control) => {
          const statistics = calculateStatistics(control.data);

          return (
            <div key={control.slug} className="space-y-4">
              <LeveyJenningsChart
                data={control.data}
                statistics={statistics}
                parameters={control.parameters}
                title={control.label}
                height={280}
                badgeLabel={toneLabel[control.tone]}
                showChartTitle={false}
              />

              <Link
                to={`/monitor/${diseaseConfig.slug}/${control.slug}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0000FF]"
              >
                Open control monitor
                <ArrowRightIcon size={16} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
