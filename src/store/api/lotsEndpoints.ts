import {
  archiveInHouseBatch,
  archiveLot,
  createInHouseBatch,
  createLot,
  getActiveInHouseBatch,
  getActiveLot,
  getInHouseBatches,
  getLots,
} from '@/lib/qcStorage';
import { ALL_STREAMS, controlId, fromStorage, fromStorageWrite, qcApi } from '@/store/api/qcApi';
import type { ControlArgs } from '@/store/api/qcApi';
import type { DiseaseSlug, InHouseBatchMetadata, LotMetadata } from '@/types/qc.types';

/**
 * Starting or archiving a lot changes which dataset is active for a control, so
 * these invalidate that control's entries by the per-control tag rather than by
 * stream — the caller should not have to know which lot is about to become current.
 */
const invalidateControlDatasets = (args: ControlArgs) =>
  [
    { type: 'Lots' as const, id: controlId(args) },
    { type: 'Entries' as const, id: controlId(args) },
    // The lot registry spans every control, so it reads the all-streams tags.
    { type: 'Lots' as const, id: ALL_STREAMS },
    { type: 'Entries' as const, id: ALL_STREAMS },
  ] as const;

const lotsEndpoints = qcApi.injectEndpoints({
  endpoints: (build) => ({
    getLots: build.query<LotMetadata[], ControlArgs>({
      queryFn: ({ disease, controlType }) => fromStorage(() => getLots(disease, controlType)),
      providesTags: (_result, _error, args) => [{ type: 'Lots', id: controlId(args) }],
    }),

    getActiveLot: build.query<LotMetadata | null, ControlArgs>({
      queryFn: ({ disease, controlType }) => fromStorage(() => getActiveLot(disease, controlType)),
      providesTags: (_result, _error, args) => [{ type: 'Lots', id: controlId(args) }],
    }),

    createLot: build.mutation<null, ControlArgs & { lot: LotMetadata }>({
      queryFn: ({ disease, controlType, lot }) =>
        fromStorageWrite(() => createLot(disease, controlType, lot)),
      invalidatesTags: (_result, _error, args) => [...invalidateControlDatasets(args)],
    }),

    archiveLot: build.mutation<null, ControlArgs & { lotNumber: string }>({
      queryFn: ({ disease, controlType, lotNumber }) =>
        fromStorageWrite(() => archiveLot(disease, controlType, lotNumber)),
      invalidatesTags: (_result, _error, args) => [...invalidateControlDatasets(args)],
    }),

    getInHouseBatches: build.query<InHouseBatchMetadata[], DiseaseSlug>({
      queryFn: (disease) => fromStorage(() => getInHouseBatches(disease)),
      providesTags: (_result, _error, disease) => [{ type: 'Batches', id: disease }],
    }),

    getActiveInHouseBatch: build.query<InHouseBatchMetadata | null, DiseaseSlug>({
      queryFn: (disease) => fromStorage(() => getActiveInHouseBatch(disease)),
      providesTags: (_result, _error, disease) => [{ type: 'Batches', id: disease }],
    }),

    createInHouseBatch: build.mutation<null, { disease: DiseaseSlug; batch: InHouseBatchMetadata }>({
      queryFn: ({ disease, batch }) => fromStorageWrite(() => createInHouseBatch(disease, batch)),
      invalidatesTags: (_result, _error, { disease }) => [
        { type: 'Batches', id: disease },
        // A new batch starts a fresh in-house dataset and violation log.
        { type: 'Entries', id: controlId({ disease, controlType: 'in-house-control' }) },
        { type: 'Violations', id: controlId({ disease, controlType: 'in-house-control' }) },
        { type: 'Entries', id: ALL_STREAMS },
        { type: 'Violations', id: ALL_STREAMS },
      ],
    }),

    archiveInHouseBatch: build.mutation<null, { disease: DiseaseSlug; batchId: string }>({
      queryFn: ({ disease, batchId }) => fromStorageWrite(() => archiveInHouseBatch(disease, batchId)),
      invalidatesTags: (_result, _error, { disease }) => [
        { type: 'Batches', id: disease },
        { type: 'Entries', id: controlId({ disease, controlType: 'in-house-control' }) },
        { type: 'Violations', id: controlId({ disease, controlType: 'in-house-control' }) },
        { type: 'Entries', id: ALL_STREAMS },
        { type: 'Violations', id: ALL_STREAMS },
      ],
    }),
  }),
});

export const {
  useGetLotsQuery,
  useGetActiveLotQuery,
  useCreateLotMutation,
  useArchiveLotMutation,
  useGetInHouseBatchesQuery,
  useGetActiveInHouseBatchQuery,
  useCreateInHouseBatchMutation,
  useArchiveInHouseBatchMutation,
} = lotsEndpoints;
