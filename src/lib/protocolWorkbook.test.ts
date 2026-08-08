import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseProtocolWorkbook } from '@/lib/protocolWorkbook';

/**
 * A real bench workbook, kept byte-for-byte.
 *
 * Its value is in the things a hand-built fixture would tidy away: the OD table
 * is a wall of formulas pointing at other sheets, "CAL " carries a trailing
 * space, the patient rows are wrapped in IF() while the control rows are not,
 * and the dates exist as serials in one sheet and as TEXT()-formatted strings
 * in another.
 */
const FIXTURE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/ME-ZCMC-2026-014.xlsx', import.meta.url)),
);

describe('parseProtocolWorkbook', () => {
  it('reads the in-house control OD', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.run.odValue).toBe(1.002);
    expect(result.run.controlLabel).toBe('IHC');
    expect(result.run.wellNumber).toBe(4);
  });

  it('reads the positive and negative control ODs from the same file', async () => {
    const positive = await parseProtocolWorkbook(FIXTURE, 'positive-control');
    const negative = await parseProtocolWorkbook(FIXTURE, 'negative-control');

    expect(positive.ok && positive.run.odValue).toBe(1.6421);
    expect(negative.ok && negative.run.odValue).toBe(0.0846);
  });

  it('identifies the disease from the test name rather than a prefix', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    // The specimen IDs in this file read MR-2026-06-00xx, which measles and
    // rubella share. Only the test name separates them.
    expect(result.ok && result.run.disease).toBe('measles');
  });

  it('reads the run date from the serial, not the mm/dd/yyyy text', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    // The worksheet renders this as "08/03/2026". Read as dd/mm it would be
    // 8 March; the underlying serial 46237 settles it as 3 August.
    expect(result.ok && result.run.date).toBe('2026-08-03');
  });

  it('reads the expiry date, which precedes the run date in this file', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    expect(result.ok && result.run.expiryDate).toBe('2026-05-11');
  });

  it('reads protocol number and lot past their fused label strings', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    if (!result.ok) {
      throw new Error(result.error);
    }

    // Worksheet holds these as "Protocol no.: X" and "Lot No.:X" — note the
    // separators disagree — so both come from the cells the formulas point at.
    expect(result.run.protocolNumber).toBe('ME-ZCMC-2026-014');
    expect(result.run.lotNumber).toBe('E251106DO');
  });

  it('reads the bench names as written on the sheet', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.run.performedBy).toBe('A.REYES');
    expect(result.run.validatedBy).toBe('M.PUTI');
  });

  it('resolves the OD through the formula instead of trusting the cache', async () => {
    const result = await parseProtocolWorkbook(FIXTURE, 'in-house-control');

    expect(result.ok && result.run.odFromCachedValue).toBe(false);
  });

  it('rejects a file that is not an Excel workbook', async () => {
    const result = await parseProtocolWorkbook(
      new TextEncoder().encode('not a workbook'),
      'in-house-control',
    );

    expect(result.ok).toBe(false);
  });
});
