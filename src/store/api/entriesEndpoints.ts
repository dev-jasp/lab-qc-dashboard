import { addEntry, deleteEntry, getEntries, updateEntry } from '@/lib/qcStorage';
import {
  ALL_STREAMS,
  controlId,
  fromStorage,
  fromStorageWrite,
  qcApi,
  streamId,
} from '@/store/api/qcApi';
import type { StreamArgs } from '@/store/api/qcApi';
import type { AuditEntry, QCEntry } from '@/types/qc.types';

/**
 * Recording, editing, or deleting a run can change which Westgard rules the stream
 * trips, so each of these also invalidates that stream's violations and the
 * all-streams query behind the sidebar and header badges. That invalidation is what
 * replaced the hand-rolled `qc-violations-changed` window event.
 */
const invalidateRunAndViolations = (args: StreamArgs) =>
  [
    { type: 'Entries' as const, id: streamId(args) },
    // The staff directory and lot registry are derived from every run, so they
    // read the all-streams tag rather than any single dataset.
    { type: 'Entries' as const, id: ALL_STREAMS },
    { type: 'Violations' as const, id: streamId(args) },
    { type: 'Violations' as const, id: ALL_STREAMS },
  ] as const;

const entriesEndpoints = qcApi.injectEndpoints({
  endpoints: (build) => ({
    getEntries: build.query<QCEntry[], StreamArgs>({
      queryFn: ({ disease, controlType, lotNumber }) =>
        fromStorage(() => getEntries(disease, controlType, lotNumber)),
      providesTags: (_result, _error, args) => [
        { type: 'Entries', id: streamId(args) },
        // Also tagged per control so lot changes can refresh without naming the lot.
        { type: 'Entries', id: controlId(args) },
      ],
    }),

    addEntry: build.mutation<null, StreamArgs & { entry: QCEntry }>({
      queryFn: ({ disease, controlType, lotNumber, entry }) =>
        fromStorageWrite(() => addEntry(disease, controlType, entry, lotNumber)),
      invalidatesTags: (_result, _error, args) => [...invalidateRunAndViolations(args)],
    }),

    updateEntry: build.mutation<null, StreamArgs & { entry: QCEntry; audit: AuditEntry }>({
      queryFn: ({ disease, controlType, lotNumber, entry, audit }) =>
        fromStorageWrite(() => updateEntry(disease, controlType, entry, audit, lotNumber)),
      invalidatesTags: (_result, _error, args) => [...invalidateRunAndViolations(args)],
    }),

    deleteEntry: build.mutation<null, StreamArgs & { entryId: string; audit: AuditEntry }>({
      queryFn: ({ disease, controlType, lotNumber, entryId, audit }) =>
        fromStorageWrite(() => deleteEntry(disease, controlType, entryId, audit, lotNumber)),
      invalidatesTags: (_result, _error, args) => [...invalidateRunAndViolations(args)],
    }),
  }),
});

export const {
  useGetEntriesQuery,
  useAddEntryMutation,
  useUpdateEntryMutation,
  useDeleteEntryMutation,
} = entriesEndpoints;
