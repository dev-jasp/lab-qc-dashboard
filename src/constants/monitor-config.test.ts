import { describe, expect, it } from 'vitest';

import {
  CONTROL_DEFINITIONS,
  DISEASE_DEFINITIONS,
  getControlMonitorSeed,
} from '@/constants/monitor-config';
import {
  calculateCUSUM,
  calculateRollingCV,
  calculateStatistics,
  evaluateQCRules,
} from '@/utils/qc-calculations';
import type { ControlSlug, DiseaseSlug } from '@/constants/monitor-config';
import type { WestgardRule } from '@/types/qc.types';

const EXPECTED_RUN_COUNT = 72;

/**
 * The QC story each seeded stream is meant to tell.
 *
 * These are asserted rather than documented because the seeded data exists to make
 * the charts legible on a cold load — an empty violation inbox or a flat rolling-CV
 * chart is a broken demo, and nothing else in the suite would catch it. `1_2s`
 * appears almost everywhere by design: over 72 runs a normal distribution puts
 * roughly 5% of points beyond 2 SD, which is exactly why Westgard treats `1_2s` as
 * an inspection trigger rather than a rejection.
 */
const EXPECTED_VIOLATIONS: Record<DiseaseSlug, Record<ControlSlug, WestgardRule[]>> = {
  measles: {
    // Measles is the reference in-control disease and must stay visibly clean, so
    // all three streams are built from bounded scatter and trip nothing at all.
    'in-house-control': [],
    'positive-control': [],
    'negative-control': [],
  },
  rubella: {
    // Mid-series imprecision widens the consecutive range past 4 SD.
    'in-house-control': ['1_2s', 'R_4s'],
    // Sustained run above the mean.
    'positive-control': ['1_2s', '10x'],
    'negative-control': ['1_2s'],
  },
  rotavirus: {
    // Eight strictly increasing runs.
    'in-house-control': ['1_2s', '7T'],
    'positive-control': ['1_2s'],
    'negative-control': ['1_2s'],
  },
  'japanese-encephalitis': {
    // The flagship drift: systematic upward shift closing on a 1_3s rejection.
    'in-house-control': ['1_2s', '1_3s', '4_1s', '10x'],
    'positive-control': ['1_2s'],
    'negative-control': ['1_2s'],
  },
  dengue: {
    // Abrupt downward step change.
    'in-house-control': ['1_2s', '2_2s', '10x'],
    // Adjacent runs on opposite sides of the mean.
    'positive-control': ['1_2s', '1_3s', 'R_4s'],
    'negative-control': ['1_2s'],
  },
};

const eachStream = DISEASE_DEFINITIONS.flatMap((disease) =>
  CONTROL_DEFINITIONS.map((control) => ({
    disease: disease.slug,
    control: control.slug,
    label: `${disease.slug}/${control.slug}`,
  })),
);

describe('seeded monitor data', () => {
  it.each(eachStream)('$label carries a full run history', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);

    expect(seed.data).toHaveLength(EXPECTED_RUN_COUNT);
  });

  it.each(eachStream)('$label is dated in ascending order', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);
    const timestamps = seed.data.map((point) => point.timestamp);
    const sorted = [...timestamps].sort((left, right) => left.localeCompare(right));

    expect(timestamps).toEqual(sorted);
  });

  it.each(eachStream)('$label uses unique protocol numbers', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);
    const protocolNumbers = new Set(seed.data.map((point) => point.sample));

    expect(protocolNumbers.size).toBe(EXPECTED_RUN_COUNT);
  });

  it.each(eachStream)('$label stores OD to four decimal places', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);

    for (const point of seed.data) {
      expect(point.value).toBe(Number(point.value.toFixed(4)));
    }
  });

  it.each(eachStream)('$label produces a full rolling-CV series', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);
    const rollingCV = calculateRollingCV(seed.data);

    // A 10-run window over 72 runs; anything less leaves the trend chart bare.
    expect(rollingCV).toHaveLength(EXPECTED_RUN_COUNT - 9);
  });

  it.each(eachStream)('$label trips exactly its intended rules', ({ disease, control }) => {
    const seed = getControlMonitorSeed(disease, control);
    const statistics = calculateStatistics(seed.data);
    const rules = evaluateQCRules(seed.data, statistics, seed.parameters);
    const violated = rules
      .filter((rule) => rule.violated)
      .map((rule) => rule.name)
      .sort();

    expect(violated).toEqual([...EXPECTED_VIOLATIONS[disease][control]].sort());
  });

  it('gives the rubella in-house stream a visible rise and fall in imprecision', () => {
    const seed = getControlMonitorSeed('rubella', 'in-house-control');
    const values = calculateRollingCV(seed.data).map((point) => point.value);
    const spread = Math.max(...values) - Math.min(...values);

    // Without a real spread the rolling-CV chart is a flat line and says nothing.
    expect(spread).toBeGreaterThan(2);
  });

  it.each(CONTROL_DEFINITIONS)('keeps every measles run inside 2 SD ($slug)', ({ slug }) => {
    const seed = getControlMonitorSeed('measles', slug);
    const statistics = calculateStatistics(seed.data);
    const maxZScore = Math.max(
      ...seed.data.map((point) => Math.abs(point.value - statistics.mean) / statistics.sd),
    );

    // Asserted directly as well as through the rule table: this is the property the
    // bounded scatter exists to guarantee, and it fails more legibly stated outright.
    expect(maxZScore).toBeLessThan(2);
  });

  it('drifts the JE in-house stream far enough for CUSUM to catch it', () => {
    // The stream the CUSUM panel exists to demonstrate. If this stops breaching,
    // the chart renders a flat pair of lines and shows nothing.
    const seed = getControlMonitorSeed('japanese-encephalitis', 'in-house-control');
    const result = calculateCUSUM(seed.data, calculateStatistics(seed.data), seed.parameters);

    expect(result.firstBreachIndex).not.toBeNull();
  });

  it.each(CONTROL_DEFINITIONS)('keeps the measles $slug stream free of CUSUM drift', ({ slug }) => {
    // Measles is the in-control reference: no Westgard violation and no drift.
    const seed = getControlMonitorSeed('measles', slug);
    const result = calculateCUSUM(seed.data, calculateStatistics(seed.data), seed.parameters);

    expect(result.firstBreachIndex).toBeNull();
  });

  it('declares a control tone consistent with the rules its data trips', () => {
    const rejectionRules = new Set<WestgardRule>(['1_3s', '2_2s', 'R_4s', '4_1s']);

    for (const disease of DISEASE_DEFINITIONS) {
      for (const summary of disease.controls) {
        const expected = EXPECTED_VIOLATIONS[disease.slug][summary.control];
        const hasRejection = expected.some((rule) => rejectionRules.has(rule));
        // `1_2s` is background noise over a long series, so it alone stays 'normal'.
        const hasWarningBeyondBaseline = expected.some(
          (rule) => !rejectionRules.has(rule) && rule !== '1_2s',
        );
        const tone = hasRejection ? 'critical' : hasWarningBeyondBaseline ? 'warning' : 'normal';

        expect({ stream: `${disease.slug}/${summary.control}`, tone: summary.tone }).toEqual({
          stream: `${disease.slug}/${summary.control}`,
          tone,
        });
      }
    }
  });
});
