import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CUSUM_LIMIT,
  DEFAULT_CUSUM_SLACK,
  calculateCUSUM,
  calculateStatistics,
} from '@/utils/qc-calculations';
import type { ChartDataPoint, QCParameters } from '@/types/qc.types';

// An SD that is exact in binary. With 0.1 the reconstructed z-scores come out at
// 1.0000000000000009, the sums accrue that error, and a breach lands a run early —
// an artefact of the fixture, not of the engine.
const PARAMETERS: QCParameters = { targetMean: 2, targetSD: 0.25 };

/** Builds a stream whose values are given as offsets from the mean, in SD units. */
function streamFromSd(offsets: number[]): ChartDataPoint[] {
  return offsets.map((offset, index) => ({
    sample: `P-${index + 1}`,
    value: PARAMETERS.targetMean + PARAMETERS.targetSD * offset,
    timestamp: `2026-01-${String(index + 1).padStart(2, '0')}`,
  }));
}

/** Runs CUSUM against the stream's own statistics, as the app does. */
function cusumFor(data: ChartDataPoint[], limit = DEFAULT_CUSUM_LIMIT) {
  return calculateCUSUM(data, calculateStatistics(data), PARAMETERS, limit);
}

describe('calculateCUSUM', () => {
  it('returns nothing for an empty stream', () => {
    const result = cusumFor([]);

    expect(result.points).toEqual([]);
    expect(result.firstBreachIndex).toBeNull();
  });

  it('holds both sums at zero while runs sit on the mean', () => {
    const result = cusumFor(streamFromSd(Array.from({ length: 20 }, () => 0)));

    expect(result.points.every((point) => point.upper === 0)).toBe(true);
    expect(result.points.every((point) => point.lower === 0)).toBe(true);
    expect(result.firstBreachIndex).toBeNull();
  });

  it('absorbs deviations smaller than the slack instead of accumulating them', () => {
    // A run 0.4 SD from the mean is inside the 0.5 SD slack, so a long stretch of
    // them must not drift the sum upward. Without the slack this is a random walk
    // that eventually breaches on noise alone.
    const drifting = streamFromSd([0.4, -0.4, 0.4, -0.4, 0.4, -0.4, 0.4, -0.4]);
    const result = calculateCUSUM(
      drifting,
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: drifting.length },
      PARAMETERS,
    );

    expect(result.points.every((point) => Math.abs(point.upper) < 0.001)).toBe(true);
    expect(result.points.every((point) => Math.abs(point.lower) < 0.001)).toBe(true);
  });

  it('accumulates a sustained upward shift until it breaches', () => {
    // A persistent +1 SD bias contributes 0.5 per run after slack, so a limit of 5
    // is crossed on the eleventh run.
    const shifted = Array.from({ length: 14 }, () => 1);
    const result = calculateCUSUM(
      streamFromSd(shifted),
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: shifted.length },
      PARAMETERS,
    );

    expect(result.firstBreachIndex).toBe(10);
    expect(result.points[10].upper).toBeGreaterThan(DEFAULT_CUSUM_LIMIT);
    expect(result.points[10].lower).toBe(0);
  });

  it('detects a downward shift on the lower sum', () => {
    const shifted = Array.from({ length: 14 }, () => -1);
    const result = calculateCUSUM(
      streamFromSd(shifted),
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: shifted.length },
      PARAMETERS,
    );

    expect(result.firstBreachIndex).toBe(10);
    expect(result.points[10].lower).toBeLessThan(-DEFAULT_CUSUM_LIMIT);
    expect(result.points[10].upper).toBe(0);
  });

  it('never lets the sums cross zero into each other', () => {
    const result = cusumFor(streamFromSd([2, 2, -3, -3, 2, 1, -1, 2, -2, 1]));

    expect(result.points.every((point) => point.upper >= 0)).toBe(true);
    expect(result.points.every((point) => point.lower <= 0)).toBe(true);
  });

  it('resets the evidence when the stream returns to target', () => {
    // Four high runs then a long stretch of on-target results: the upper sum must
    // decay back to zero rather than holding the old excursion against the stream.
    // Four runs at +2 SD build 6.0; on-target runs shed the 0.5 slack each, so it
    // takes twelve of them to clear.
    const offsets = [2, 2, 2, 2, ...Array.from({ length: 12 }, () => 0)];
    const result = calculateCUSUM(
      streamFromSd(offsets),
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: offsets.length },
      PARAMETERS,
    );

    expect(result.points[3].upper).toBeCloseTo(6, 10);
    expect(result.points[offsets.length - 1].upper).toBe(0);
  });

  it('catches a sustained shift sooner than a single-point rule would', () => {
    // The point of pairing CUSUM with Levey-Jennings: a steady 1 SD bias never
    // reaches the 2 SD line, so 1_2s never fires, yet CUSUM breaches.
    const shifted = streamFromSd(Array.from({ length: 14 }, () => 1));
    const result = calculateCUSUM(
      shifted,
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: shifted.length },
      PARAMETERS,
    );

    const worstZScore = Math.max(...result.points.map((point) => Math.abs(point.zScore)));

    expect(worstZScore).toBeLessThan(2);
    expect(result.firstBreachIndex).not.toBeNull();
  });

  it('honours a tighter decision interval', () => {
    const shifted = streamFromSd(Array.from({ length: 14 }, () => 1));
    const strict = calculateCUSUM(
      shifted,
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: shifted.length },
      PARAMETERS,
      3,
    );
    const lenient = calculateCUSUM(
      shifted,
      { mean: PARAMETERS.targetMean, sd: PARAMETERS.targetSD, sampleCount: shifted.length },
      PARAMETERS,
      8,
    );

    expect(strict.firstBreachIndex).not.toBeNull();
    expect(lenient.firstBreachIndex).toBeNull();
    expect(strict.firstBreachIndex ?? 0).toBeLessThan(10);
  });

  it('falls back to the target SD when the stream has none of its own', () => {
    // Two identical runs have a sample SD of zero; without the fallback this
    // divides by zero and every z-score becomes NaN.
    const flat = streamFromSd([0, 0]);
    const result = calculateCUSUM(flat, calculateStatistics(flat), PARAMETERS);

    expect(result.points).toHaveLength(2);
    expect(result.points.every((point) => Number.isFinite(point.zScore))).toBe(true);
  });

  it('reports the slack and limit it used', () => {
    const result = cusumFor(streamFromSd([0, 0, 0]), 4);

    expect(result.limit).toBe(4);
    expect(result.slack).toBe(DEFAULT_CUSUM_SLACK);
  });
});
