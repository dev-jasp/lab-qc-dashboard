import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

/**
 * Identifies one control stream: the disease / control / lot triple that every
 * dataset in `qcStorage` is keyed by.
 *
 * Cache tags are built from the same triple, so a tag and a storage key describe
 * exactly the same thing. That is what keeps invalidation honest — submitting a
 * measles run cannot cause rubella's cache to refetch.
 */
export type StreamArgs = {
  disease: DiseaseSlug;
  controlType: ControlTypeSlug;
  /** Reagent lot for positive/negative controls. Omit for in-house control. */
  lotNumber?: string;
};

export type ControlArgs = {
  disease: DiseaseSlug;
  controlType: ControlTypeSlug;
};

/** Tag id for a single dataset, matching the storage key it stands for. */
export const streamId = ({ disease, controlType, lotNumber }: StreamArgs): string =>
  `${disease}/${controlType}/${lotNumber ?? 'ACTIVE'}`;

/**
 * Tag id covering every lot of one control.
 *
 * Entry queries provide this alongside their own stream id so that starting or
 * archiving a lot — which changes which dataset is active — can refresh that
 * control's entries without naming the lot that is about to become current.
 */
export const controlId = ({ disease, controlType }: ControlArgs): string =>
  `${disease}/${controlType}`;

/** Sentinel for queries spanning every stream, such as the violation inbox. */
export const ALL_STREAMS = 'ALL';

/** Tag id for the singleton settings and staff records. */
export const SINGLETON = 'SINGLETON';

/**
 * Adapts a `qcStorage` call to RTK Query's `queryFn` contract.
 *
 * `qcStorage` throws on malformed payloads and unreadable keys; RTK Query expects
 * a discriminated result instead. Everything funnels through here so that error
 * shape is defined once rather than in each of the endpoints.
 */
export async function fromStorage<T>(
  operation: () => Promise<T>,
): Promise<{ data: T } | { error: string }> {
  try {
    return { data: await operation() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown storage error.' };
  }
}

/** `fromStorage` for writes: RTK Query has no void result, so they resolve to null. */
export async function fromStorageWrite(
  operation: () => Promise<void>,
): Promise<{ data: null } | { error: string }> {
  return fromStorage(async () => {
    await operation();
    return null;
  });
}

/**
 * The QC cache.
 *
 * `fakeBaseQuery` because there is no HTTP here — every endpoint supplies its own
 * `queryFn` over `src/lib/qcStorage.ts`, which already presents an async,
 * promise-returning interface. When a real backend replaces localStorage, only
 * those `queryFn` bodies change; the tag map above it stays as it is.
 */
export const qcApi = createApi({
  reducerPath: 'qcApi',
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: ['Entries', 'Violations', 'Lots', 'Batches', 'Settings', 'Staff'],
  endpoints: () => ({}),
});
