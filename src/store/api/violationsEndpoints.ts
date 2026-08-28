import { acknowledgeViolation, addViolation, getAllViolations, getViolations } from '@/lib/qcStorage';
import {
  ALL_STREAMS,
  controlId,
  fromStorage,
  fromStorageWrite,
  qcApi,
  streamId,
} from '@/store/api/qcApi';
import type { StreamArgs } from '@/store/api/qcApi';
import type { CorrectiveAction, ViolationEntry } from '@/types/qc.types';

/**
 * Every violation write touches two audiences: the stream's own log, and the
 * all-streams query that the violation inbox, the sidebar badge, and the header
 * badge all read. Naming both tags here is what lets those three components stay
 * in step without listening for anything.
 */
const invalidateViolationViews = (args: StreamArgs) =>
  [
    { type: 'Violations' as const, id: streamId(args) },
    { type: 'Violations' as const, id: controlId(args) },
    { type: 'Violations' as const, id: ALL_STREAMS },
  ] as const;

const violationsEndpoints = qcApi.injectEndpoints({
  endpoints: (build) => ({
    getViolations: build.query<ViolationEntry[], StreamArgs>({
      queryFn: ({ disease, controlType, lotNumber }) =>
        fromStorage(() => getViolations(disease, controlType, lotNumber)),
      providesTags: (_result, _error, args) => [
        { type: 'Violations', id: streamId(args) },
        { type: 'Violations', id: controlId(args) },
      ],
    }),

    getAllViolations: build.query<ViolationEntry[], void>({
      queryFn: () => fromStorage(() => getAllViolations()),
      providesTags: [{ type: 'Violations', id: ALL_STREAMS }],
    }),

    addViolation: build.mutation<null, StreamArgs & { violation: ViolationEntry }>({
      queryFn: ({ disease, controlType, lotNumber, violation }) =>
        fromStorageWrite(() => addViolation(disease, controlType, violation, lotNumber)),
      invalidatesTags: (_result, _error, args) => [...invalidateViolationViews(args)],
    }),

    acknowledgeViolation: build.mutation<
      null,
      StreamArgs & { violationId: string; correctiveAction: CorrectiveAction }
    >({
      queryFn: ({ disease, controlType, lotNumber, violationId, correctiveAction }) =>
        fromStorageWrite(() =>
          acknowledgeViolation(disease, controlType, violationId, correctiveAction, lotNumber),
        ),
      invalidatesTags: (_result, _error, args) => [...invalidateViolationViews(args)],
    }),
  }),
});

export const {
  useGetViolationsQuery,
  useGetAllViolationsQuery,
  useAddViolationMutation,
  useAcknowledgeViolationMutation,
} = violationsEndpoints;
