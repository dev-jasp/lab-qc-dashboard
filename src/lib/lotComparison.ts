import { getEntries, getInHouseBatches, getLots } from '@/lib/qcStorage';
import { gradeShift, type LotShift } from '@/lib/lotRegistry';
import { calculateStatistics } from '@/utils/qc-calculations';
import { entriesToChartData } from '@/lib/qcMonitor';
import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

export type LotComparisonRow = {
  /** Lot number, or batch id for in-house control. */
  id: string;
  kind: 'lot' | 'batch';
  status: 'active' | 'archived';
  startDate: string;
  endDate: string | null;
  runCount: number;
  mean: number;
  sd: number;
  cv: number;
  /** Grade against the partition this one replaced, or null for the oldest. */
  shift: LotShift | null;
};

/**
 * Every lot — or in-house batch — on one control stream, with its statistics and
 * its grade against the one it replaced.
 *
 * Scoped to a single control on purpose. The lot console needs the same numbers
 * for all fifteen streams and builds them from the export catalog, but the
 * control monitor only ever shows one, and making it read every disease's
 * storage to render one panel would be a real cost on a page that already reads
 * a lot.
 *
 * Returned newest first, matching the lot tables.
 */
export async function buildControlLotComparison(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
): Promise<LotComparisonRow[]> {
  const isInHouse = controlType === 'in-house-control';

  const partitions = isInHouse
    ? (await getInHouseBatches(disease)).map((batch) => ({
        id: batch.batchId,
        status: batch.status,
        startDate: batch.startDate,
        endDate: batch.endDate,
      }))
    : (await getLots(disease, controlType)).map((lot) => ({
        id: lot.lotNumber,
        status: lot.status,
        startDate: lot.startDate,
        endDate: lot.endDate,
      }));

  // Oldest first while grading, so each row is compared against its predecessor.
  const ordered = [...partitions].sort((first, second) =>
    first.startDate.localeCompare(second.startDate),
  );

  const rows: LotComparisonRow[] = [];

  for (const partition of ordered) {
    const entries = await getEntries(disease, controlType, partition.id);
    const statistics = calculateStatistics(entriesToChartData(entries));
    const cv = statistics.mean === 0 ? 0 : (statistics.sd / statistics.mean) * 100;
    const previous = rows.at(-1);

    rows.push({
      id: partition.id,
      kind: isInHouse ? 'batch' : 'lot',
      status: partition.status,
      startDate: partition.startDate,
      endDate: partition.endDate,
      runCount: entries.length,
      mean: statistics.mean,
      sd: statistics.sd,
      cv,
      shift:
        previous === undefined
          ? null
          : gradeShift(
              { id: partition.id, mean: statistics.mean, sd: statistics.sd, cv, runCount: entries.length },
              {
                id: previous.id,
                mean: previous.mean,
                sd: previous.sd,
                cv: previous.cv,
                runCount: previous.runCount,
              },
            ),
    });
  }

  return rows.reverse();
}
