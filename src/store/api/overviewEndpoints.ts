import { buildDiseaseOverview } from '@/lib/diseaseOverview';
import type { OverviewControlSummary } from '@/lib/diseaseOverview';
import { buildLotRegistry } from '@/lib/lotRegistry';
import type { LotRegistry } from '@/lib/lotRegistry';
import { buildStaffDirectory } from '@/lib/staffDirectory';
import type { StaffRecord } from '@/lib/staffDirectory';
import { ALL_STREAMS, SINGLETON, controlId, fromStorage, qcApi } from '@/store/api/qcApi';
import type { DiseaseSlug } from '@/types/qc.types';

/**
 * Composite reads.
 *
 * These endpoints wrap aggregate helpers rather than single `qcStorage` functions.
 * They earn their place in the cache for the same reason the direct reads do: each
 * one is derived from data that mutations elsewhere invalidate, so left on its own
 * `useEffect` it would quietly go stale. Adding a staff member would update the
 * roster and leave the personnel directory showing the old list.
 *
 * They are tagged broadly — every lot, every staff record — because that is
 * genuinely what they read. A narrower tag here would be a lie.
 */
const overviewEndpoints = qcApi.injectEndpoints({
  endpoints: (build) => ({
    getStaffDirectory: build.query<StaffRecord[], void>({
      queryFn: () => fromStorage(() => buildStaffDirectory()),
      // Reads the roster and every run attributed to it.
      providesTags: [
        { type: 'Staff', id: SINGLETON },
        { type: 'Entries', id: ALL_STREAMS },
      ],
    }),

    getLotRegistry: build.query<LotRegistry, number>({
      queryFn: (warningDays) => fromStorage(() => buildLotRegistry(warningDays)),
      providesTags: [
        { type: 'Lots', id: ALL_STREAMS },
        { type: 'Entries', id: ALL_STREAMS },
      ],
    }),

    getDiseaseOverview: build.query<OverviewControlSummary[], DiseaseSlug>({
      queryFn: (disease) => fromStorage(() => buildDiseaseOverview(disease)),
      // Scoped to one disease's three controls rather than the all-streams tag,
      // since that is exactly what the summary reads.
      providesTags: (_result, _error, disease) => [
        { type: 'Batches', id: disease },
        { type: 'Entries', id: controlId({ disease, controlType: 'in-house-control' }) },
        { type: 'Entries', id: controlId({ disease, controlType: 'positive-control' }) },
        { type: 'Entries', id: controlId({ disease, controlType: 'negative-control' }) },
        { type: 'Lots', id: controlId({ disease, controlType: 'positive-control' }) },
        { type: 'Lots', id: controlId({ disease, controlType: 'negative-control' }) },
      ],
    }),
  }),
});

export const {
  useGetStaffDirectoryQuery,
  useGetLotRegistryQuery,
  useGetDiseaseOverviewQuery,
} = overviewEndpoints;
