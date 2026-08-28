import { describe, expect, it } from 'vitest';

import {
  CONTROL_DEFINITIONS,
  DISEASE_DEFINITIONS,
  getControlMonitorSeed,
  getPriorLotSeed,
} from '@/constants/monitor-config';
import { buildSeedLots, buildSeedPriorEntries } from '@/lib/qcMonitor';
import { calculateStatistics } from '@/utils/qc-calculations';
import type { ControlSlug, DiseaseSlug } from '@/constants/monitor-config';

const DISEASES = DISEASE_DEFINITIONS.map((disease) => disease.slug);
const LOT_CONTROLS = CONTROL_DEFINITIONS.map((control) => control.slug).filter(
  (slug): slug is Exclude<ControlSlug, 'in-house-control'> => slug !== 'in-house-control',
);

/** Every disease/control pair that is scoped to a reagent lot. */
const LOT_STREAMS: Array<[DiseaseSlug, Exclude<ControlSlug, 'in-house-control'>]> =
  DISEASES.flatMap((disease) => LOT_CONTROLS.map((control) => [disease, control] as const)).map(
    ([disease, control]) => [disease, control],
  );

describe('getPriorLotSeed', () => {
  it('gives in-house control a prior batch, stamped by date rather than lot number', () => {
    for (const disease of DISEASES) {
      const prior = getPriorLotSeed(disease, 'in-house-control');

      expect(prior).not.toBeNull();
      // In-house controls are lab-made, so nothing is bought and there is no kit
      // lot number to echo. The id says when the batch was made instead.
      expect(prior!.lotNumber).toMatch(/^IH-\d{6}$/);
    }
  });

  it('gives every stream a prior partition, including in-house', () => {
    for (const disease of DISEASES) {
      for (const control of CONTROL_DEFINITIONS.map((definition) => definition.slug)) {
        expect(getPriorLotSeed(disease, control)).not.toBeNull();
      }
    }
  });

  it('retires the prior lot before the current one starts', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const prior = getPriorLotSeed(disease, control);
      const current = getControlMonitorSeed(disease, control);

      expect(prior).not.toBeNull();
      // ISO strings compare lexicographically, which is the convention the rest
      // of the codebase relies on for dates.
      expect(prior!.startDate < prior!.endDate).toBe(true);
      expect(prior!.endDate < (current.lotStartDate ?? '')).toBe(true);
    }
  });

  it('keeps every prior run inside the prior lot window', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const prior = getPriorLotSeed(disease, control)!;

      for (const point of prior.data) {
        expect(point.timestamp >= prior.startDate).toBe(true);
        expect(point.timestamp <= prior.endDate).toBe(true);
      }
    }
  });

  it('numbers the prior lot in the format the lab uses', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const prior = getPriorLotSeed(disease, control)!;
      const current = getControlMonitorSeed(disease, control).lotNumber!;

      // Letters, a yyMMdd stamp, then letters — matching E240423AS.
      expect(prior.lotNumber).toMatch(/^[A-Z]+\d{6}[A-Z]*$/);
      expect(prior.lotNumber).not.toBe(current);
    }
  });

  it('is deterministic across calls', () => {
    for (const [disease, control] of LOT_STREAMS) {
      expect(getPriorLotSeed(disease, control)).toEqual(getPriorLotSeed(disease, control));
    }
  });
});

describe('buildSeedLots with a prior lot', () => {
  it('returns the lots oldest first', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const lots = buildSeedLots(disease, control);
      const dates = lots.map((lot) => lot.startDate);

      expect(lots).toHaveLength(2);
      expect([...dates].sort()).toEqual(dates);
    }
  });

  it('leaves exactly one lot active, and it is the newest', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const lots = buildSeedLots(disease, control);
      const active = lots.filter((lot) => lot.status === 'active');

      expect(active).toHaveLength(1);
      expect(active[0]).toBe(lots.at(-1));
      expect(active[0].endDate).toBeNull();
    }
  });

  it('closes the archived lot with an end date', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const archived = buildSeedLots(disease, control).filter((lot) => lot.status === 'archived');

      expect(archived).toHaveLength(1);
      expect(archived[0].endDate).not.toBeNull();
    }
  });

  it('still returns nothing for in-house control', () => {
    for (const disease of DISEASES) {
      expect(buildSeedLots(disease, 'in-house-control')).toEqual([]);
    }
  });
});

describe('buildSeedPriorEntries', () => {
  it('tags every prior entry with the prior lot number', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const prior = getPriorLotSeed(disease, control)!;
      const entries = buildSeedPriorEntries(disease, control);

      expect(entries.length).toBe(prior.data.length);
      expect(entries.every((entry) => entry.lotNumber === prior.lotNumber)).toBe(true);
    }
  });

  it('tags in-house prior entries with the prior batch id', () => {
    for (const disease of DISEASES) {
      const prior = getPriorLotSeed(disease, 'in-house-control')!;
      const entries = buildSeedPriorEntries(disease, 'in-house-control');

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((entry) => entry.lotNumber === prior.lotNumber)).toBe(true);
      // Never the sentinel the active in-house dataset is stored under, or the
      // prior batch would overwrite the runs currently in service.
      expect(entries.every((entry) => entry.lotNumber !== 'INHOUSE')).toBe(true);
    }
  });

  it('never collides with the active lot number', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const activeLot = getControlMonitorSeed(disease, control).lotNumber!;

      expect(
        buildSeedPriorEntries(disease, control).every((entry) => entry.lotNumber !== activeLot),
      ).toBe(true);
    }
  });
});

describe('the seeded changeovers as a demo set', () => {
  /** Mean shift from prior lot to current, measured in the prior lot's own SDs. */
  const shiftInPriorSDs = (disease: DiseaseSlug, control: Exclude<ControlSlug, 'in-house-control'>) => {
    const prior = getPriorLotSeed(disease, control)!;
    const priorStats = calculateStatistics(prior.data);
    const currentStats = calculateStatistics(getControlMonitorSeed(disease, control).data);

    return Math.abs(currentStats.mean - priorStats.mean) / priorStats.sd;
  };

  it('spans the full range the lot console grades', () => {
    const shifts = LOT_STREAMS.map(([disease, control]) => shiftInPriorSDs(disease, control));

    // The console tones a changeover at >1 SD and again at >2 SD. A demo set that
    // never reaches those thresholds would show one colour and prove nothing, so
    // the spread here is the point rather than an accident of the seed.
    expect(shifts.some((shift) => shift < 1)).toBe(true);
    expect(shifts.some((shift) => shift > 1)).toBe(true);
    expect(shifts.some((shift) => shift > 2)).toBe(true);
  });

  it('keeps every prior lot mean physically plausible', () => {
    for (const [disease, control] of LOT_STREAMS) {
      const { mean } = calculateStatistics(getPriorLotSeed(disease, control)!.data);

      // OD is an absorbance reading; a negative or absurd mean would mean the
      // shift had overwhelmed the target rather than perturbed it.
      expect(mean).toBeGreaterThan(0);
      expect(mean).toBeLessThan(4);
    }
  });
});
