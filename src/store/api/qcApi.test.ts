import { describe, expect, it } from 'vitest';

import { controlId, fromStorage, fromStorageWrite, streamId } from './qcApi';

describe('cache tag ids', () => {
  it('separates two lots of the same control', () => {
    // The whole point of per-stream tags: recording against one lot must not
    // invalidate another lot's cached entries.
    const first = streamId({
      disease: 'measles',
      controlType: 'positive-control',
      lotNumber: 'E240423AS',
    });
    const second = streamId({
      disease: 'measles',
      controlType: 'positive-control',
      lotNumber: 'E240501BX',
    });

    expect(first).not.toBe(second);
  });

  it('separates the same lot number across diseases', () => {
    const measles = streamId({
      disease: 'measles',
      controlType: 'positive-control',
      lotNumber: 'SHARED',
    });
    const rubella = streamId({
      disease: 'rubella',
      controlType: 'positive-control',
      lotNumber: 'SHARED',
    });

    expect(measles).not.toBe(rubella);
  });

  it('falls back to a stable id when no lot is named', () => {
    // In-house control has no lot, so both callers must land on one cache entry.
    expect(streamId({ disease: 'dengue', controlType: 'in-house-control' })).toBe(
      streamId({ disease: 'dengue', controlType: 'in-house-control' }),
    );
  });

  it('groups every lot of a control under one id', () => {
    expect(controlId({ disease: 'measles', controlType: 'positive-control' })).toBe(
      'measles/positive-control',
    );
  });

  it('keeps the control id distinct from any stream id beneath it', () => {
    const control = controlId({ disease: 'measles', controlType: 'positive-control' });
    const stream = streamId({
      disease: 'measles',
      controlType: 'positive-control',
      lotNumber: 'E240423AS',
    });

    expect(control).not.toBe(stream);
  });
});

describe('storage adapters', () => {
  it('passes a resolved value through as data', async () => {
    await expect(fromStorage(async () => 42)).resolves.toEqual({ data: 42 });
  });

  it('converts a thrown storage error into an error result', async () => {
    // qcStorage throws; RTK Query expects a discriminated result, and an
    // unconverted throw would surface as an unhandled rejection.
    await expect(
      fromStorage(async () => {
        throw new Error('Failed to read storage key "qc_measles"');
      }),
    ).resolves.toEqual({ error: 'Failed to read storage key "qc_measles"' });
  });

  it('describes a non-Error throw rather than leaking undefined', async () => {
    await expect(
      fromStorage(async () => {
        throw 'oops';
      }),
    ).resolves.toEqual({ error: 'Unknown storage error.' });
  });

  it('resolves writes to null because RTK Query has no void result', async () => {
    await expect(fromStorageWrite(async () => undefined)).resolves.toEqual({ data: null });
  });
});
