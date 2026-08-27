import { getDiseaseControls } from '@/constants/monitor-config';
import {
  ensureControlDatasetInitialized,
  entriesToChartData,
  getControlParameters,
} from '@/lib/qcMonitor';
import { getEntries, getInHouseBatches, getLots } from '@/lib/qcStorage';
import type { ChartDataPoint, ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

export type OverviewControlSummary = ReturnType<typeof getDiseaseControls>[number] & {
  activeLotNumber: string | null;
  lotStartDate: string | null;
  activeRuns: number;
  data: ChartDataPoint[];
};

/**
 * Summarises one control stream for the disease overview: its active lot or batch
 * and the run history behind it.
 *
 * Lives here rather than in the page because it is storage and domain logic with
 * no React in it, which is also what lets the cache call it.
 */
async function buildControlSummary(
  disease: DiseaseSlug,
  control: ReturnType<typeof getDiseaseControls>[number],
): Promise<OverviewControlSummary> {
  await ensureControlDatasetInitialized(disease, control.slug);

  if (control.slug === 'in-house-control') {
    const batches = await getInHouseBatches(disease);
    const activeBatch = batches.find((batch) => batch.status === 'active') ?? batches[0] ?? null;
    const entries = activeBatch
      ? await getEntries(disease, control.slug, activeBatch.batchId)
      : [];

    return {
      ...control,
      parameters: getControlParameters(disease, control.slug),
      data: entriesToChartData(entries),
      activeLotNumber: activeBatch?.batchId ?? 'No active batch',
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

/** Summarises all three control streams of a disease, seeding them if needed. */
export async function buildDiseaseOverview(
  disease: DiseaseSlug,
): Promise<OverviewControlSummary[]> {
  return Promise.all(
    getDiseaseControls(disease).map((control) => buildControlSummary(disease, control)),
  );
}
