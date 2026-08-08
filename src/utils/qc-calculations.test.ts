import { describe, expect, it } from 'vitest';

import type { ChartDataPoint, QCParameters, QCRule, WestgardRule } from '../types/qc.types';
import {
  calculateStatistics,
  calculateZScore,
  evaluateQCRules,
  getPointColor,
} from './qc-calculations';

const PARAMETERS: QCParameters = { targetMean: 100, targetSD: 10 };

/** Westgard evaluation needs 10 runs before any rule reports, so pad to length. */
function toPoints(values: number[]): ChartDataPoint[] {
  return values.map((value, index) => ({
    sample: String(index + 1),
    value,
    timestamp: `2026-03-${String(index + 1).padStart(2, '0')}`,
  }));
}

function ruleFor(rules: QCRule[], name: WestgardRule): QCRule {
  const rule = rules.find((candidate) => candidate.name === name);

  if (rule === undefined) {
    throw new Error(`No rule "${name}" in the evaluated set.`);
  }

  return rule;
}

/**
 * Evaluates against fixed parameters rather than the series' own statistics, so
 * a test controls exactly where the SD boundaries fall.
 */
function evaluate(values: number[]): QCRule[] {
  const data = toPoints(values);
  // sd: 0 forces getResolvedSD to fall back to parameters.targetSD.
  return evaluateQCRules(data, { mean: 100, sd: 0, sampleCount: data.length }, PARAMETERS);
}

describe('calculateStatistics', () => {
  it('returns zeroed statistics for an empty series', () => {
    expect(calculateStatistics([])).toEqual({ mean: 0, sd: 0, sampleCount: 0 });
  });

  it('reports zero SD for a single run, which has no spread to measure', () => {
    expect(calculateStatistics(toPoints([2.5]))).toEqual({ mean: 2.5, sd: 0, sampleCount: 1 });
  });

  it('uses the sample standard deviation (n-1), not the population one', () => {
    // For [2,4,4,4,5,5,7,9]: population SD is 2, sample SD is ~2.138.
    const { mean, sd } = calculateStatistics(toPoints([2, 4, 4, 4, 5, 5, 7, 9]));

    expect(mean).toBe(5);
    expect(sd).toBeCloseTo(2.13809, 4);
  });
});

describe('evaluateQCRules', () => {
  it('reports insufficient_data until 10 runs are recorded', () => {
    const rules = evaluate([100, 100, 100, 100, 100, 100, 100, 100, 100]);

    expect(rules.every((rule) => rule.status === 'insufficient_data')).toBe(true);
  });

  it('passes a well-behaved series with no violations', () => {
    const rules = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 102, 98]);

    expect(rules.some((rule) => rule.violated)).toBe(false);
  });

  it('flags 1_3s when a single run exceeds 3SD', () => {
    // 135 is +3.5SD against mean 100 / SD 10.
    const rules = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 102, 135]);

    expect(ruleFor(rules, '1_3s').violated).toBe(true);
    expect(ruleFor(rules, '1_3s').triggeringIndices).toEqual([9]);
    expect(ruleFor(rules, '1_3s').severity).toBe('rejection');
  });

  it('flags 1_2s as a warning without escalating to 1_3s', () => {
    // 125 is +2.5SD: past 2SD, short of 3SD.
    const rules = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 102, 125]);

    expect(ruleFor(rules, '1_2s').violated).toBe(true);
    expect(ruleFor(rules, '1_2s').severity).toBe('warning');
    expect(ruleFor(rules, '1_3s').violated).toBe(false);
  });

  it('flags 2_2s only when both runs breach 2SD on the same side', () => {
    const sameSide = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 125, 126]);

    expect(ruleFor(sameSide, '2_2s').violated).toBe(true);
    expect(ruleFor(sameSide, '2_2s').triggeringIndices).toEqual([8, 9]);
  });

  it('does not flag 2_2s when consecutive breaches straddle the mean', () => {
    // +2.5SD then -2.5SD: two 1_2s hits, but opposite sides, so not 2_2s.
    const opposite = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 125, 75]);

    expect(ruleFor(opposite, '1_2s').violated).toBe(true);
    expect(ruleFor(opposite, '2_2s').violated).toBe(false);
  });

  it('flags R_4s when the span between consecutive runs exceeds 4SD', () => {
    // 78 -> 123 is a 45-unit swing, or 4.5SD.
    const rules = evaluate([100, 102, 98, 101, 99, 103, 97, 100, 78, 123]);

    expect(ruleFor(rules, 'R_4s').violated).toBe(true);
    expect(ruleFor(rules, 'R_4s').triggeringIndices).toEqual([8, 9]);
  });

  it('flags 4_1s for four consecutive runs beyond the same 1SD limit', () => {
    const rules = evaluate([100, 102, 98, 101, 99, 103, 112, 113, 114, 115]);

    expect(ruleFor(rules, '4_1s').violated).toBe(true);
    expect(ruleFor(rules, '4_1s').triggeringIndices).toEqual([6, 7, 8, 9]);
  });

  it('flags 10x for ten consecutive runs on one side of the mean', () => {
    const rules = evaluate([101, 102, 103, 101, 102, 104, 103, 101, 102, 103]);

    expect(ruleFor(rules, '10x').violated).toBe(true);
    expect(ruleFor(rules, '10x').triggeringIndices).toHaveLength(10);
  });

  it('flags 7T for seven strictly increasing runs', () => {
    const rules = evaluate([100, 99, 98, 97, 98, 99, 100, 101, 102, 103]);

    expect(ruleFor(rules, '7T').violated).toBe(true);
    expect(ruleFor(rules, '7T').triggeringIndices).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('does not treat a plateau as a 7T trend, since the run must be strict', () => {
    // Repeats a value mid-run, breaking the strictly-increasing requirement.
    const rules = evaluate([100, 99, 98, 97, 98, 98, 100, 101, 102, 103]);

    expect(ruleFor(rules, '7T').violated).toBe(false);
  });

  it('cannot evaluate against a zero SD, so reports passed rather than violated', () => {
    const flat = toPoints([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    const rules = evaluateQCRules(
      flat,
      { mean: 5, sd: 0, sampleCount: flat.length },
      { targetMean: 5, targetSD: 0 },
    );

    expect(rules.every((rule) => rule.violated === false)).toBe(true);
    expect(rules.every((rule) => rule.status === 'passed')).toBe(true);
  });
});

describe('calculateZScore', () => {
  it('measures distance from the mean in standard deviations', () => {
    expect(calculateZScore(120, 100, 10)).toBe(2);
    expect(calculateZScore(85, 100, 10)).toBe(-1.5);
  });

  it('returns 0 when SD is 0 rather than dividing by zero', () => {
    expect(calculateZScore(120, 100, 0)).toBe(0);
  });
});

describe('getPointColor', () => {
  it.each([
    [0.5, '#0000FF'],
    [1.5, '#A89F91'],
    [2.5, '#FFA500'],
    [3.5, '#B22222'],
    [-3.5, '#B22222'],
  ])('maps a z-score of %s to %s', (zScore, expected) => {
    expect(getPointColor(zScore)).toBe(expected);
  });

  it('treats the boundaries as inclusive of the lower band', () => {
    // Exactly 2SD is still the 1-2SD colour; the rule is "greater than".
    expect(getPointColor(2)).toBe('#A89F91');
    expect(getPointColor(3)).toBe('#FFA500');
  });
});
