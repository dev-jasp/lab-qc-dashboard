import { describe, expect, it } from 'vitest';

import {
  NORMAL_BAND_SHARE,
  OD_HISTOGRAM_BIN_SD,
  buildODDistribution,
  calculateStatistics,
} from '@/utils/qc-calculations';
import type { ChartDataPoint, QCParameters } from '@/types/qc.types';

// An SD that is exact in binary, so bin edges land where the arithmetic says
// they do rather than a float-error step away.
const PARAMETERS: QCParameters = { targetMean: 2, targetSD: 0.25 };

/** Builds a stream whose values are given as offsets from the mean, in SD units. */
function streamFromSd(offsets: number[]): ChartDataPoint[] {
  return offsets.map((offset, index) => ({
    sample: `P-${index + 1}`,
    value: PARAMETERS.targetMean + PARAMETERS.targetSD * offset,
    timestamp: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
  }));
}

/** Runs the distribution against the stream's own statistics, as the app does. */
function distributionFor(data: ChartDataPoint[]) {
  return buildODDistribution(data, calculateStatistics(data), PARAMETERS);
}

/** A symmetric spread that reuses each offset and its negation. */
const SYMMETRIC = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];

describe('buildODDistribution', () => {
  it('returns an empty distribution below two runs', () => {
    expect(distributionFor([]).bins).toEqual([]);
    expect(distributionFor(streamFromSd([0])).bins).toEqual([]);
  });

  it('reports the run count it could not bin', () => {
    expect(distributionFor(streamFromSd([0])).sampleCount).toBe(1);
  });

  it('bins every run exactly once', () => {
    const result = distributionFor(streamFromSd(SYMMETRIC));
    const binned = result.bins.reduce((total, bin) => total + bin.count, 0);

    expect(binned).toBe(SYMMETRIC.length);
    expect(result.sampleCount).toBe(SYMMETRIC.length);
  });

  it('puts the mean and every SD boundary on a bin edge', () => {
    const { bins } = distributionFor(streamFromSd(SYMMETRIC));
    const edges = bins.map((bin) => bin.startZ).concat(bins[bins.length - 1].endZ);

    // Every boundary the Levey-Jennings chart draws must coincide with an edge,
    // otherwise a reference line would cut a bar in half and the bar would span
    // two bands at once.
    for (const boundary of [-3, -2, -1, 0, 1, 2, 3]) {
      if (boundary >= edges[0] && boundary <= edges[edges.length - 1]) {
        expect(edges.some((edge) => Math.abs(edge - boundary) < 1e-9)).toBe(true);
      }
    }
  });

  it('uses the configured bin width', () => {
    const { bins } = distributionFor(streamFromSd(SYMMETRIC));

    for (const bin of bins) {
      expect(bin.endZ - bin.startZ).toBeCloseTo(OD_HISTOGRAM_BIN_SD, 10);
      expect(bin.midZ).toBeCloseTo((bin.startZ + bin.endZ) / 2, 10);
    }
  });

  it('converts bin edges back to OD units', () => {
    const { bins } = distributionFor(streamFromSd(SYMMETRIC));
    const statistics = calculateStatistics(streamFromSd(SYMMETRIC));

    for (const bin of bins) {
      expect(bin.start).toBeCloseTo(statistics.mean + bin.startZ * statistics.sd, 10);
      expect(bin.end).toBeCloseTo(statistics.mean + bin.endZ * statistics.sd, 10);
    }
  });

  it('counts band occupancy against the dataset SD', () => {
    // Nine runs: five inside 1 SD, two more inside 2 SD, two more inside 3 SD.
    const result = distributionFor(
      streamFromSd([0, 0, 0, 0, 0, 1.5, -1.5, 2.5, -2.5]),
    );

    // The dataset's own SD is not the seeded one, so assert on the ordering and
    // totals rather than on hand-computed percentages.
    expect(result.observed.oneSD).toBeLessThanOrEqual(result.observed.twoSD);
    expect(result.observed.twoSD).toBeLessThanOrEqual(result.observed.threeSD);
    expect(result.observed.threeSD).toBe(100);
  });

  it('reports the normal-theory expectation for comparison', () => {
    expect(distributionFor(streamFromSd(SYMMETRIC)).expected).toEqual(
      NORMAL_BAND_SHARE,
    );
  });

  it('finds no skew in a symmetric spread', () => {
    expect(distributionFor(streamFromSd(SYMMETRIC)).skewness).toBeCloseTo(0, 10);
  });

  it('reports positive skewness for a tail towards high OD', () => {
    const result = distributionFor(
      streamFromSd([0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 4]),
    );

    expect(result.skewness).toBeGreaterThan(0);
  });

  it('reports negative skewness for a tail towards low OD', () => {
    const result = distributionFor(
      streamFromSd([0, 0, 0, 0, 0, 0, -0.5, -0.5, -1, -4]),
    );

    expect(result.skewness).toBeLessThan(0);
  });

  it('leaves the centre empty when the stream is bimodal', () => {
    // Two reagent populations, each tight, neither near the pooled mean. Both
    // humps sit inside 2 SD, so no Westgard rule and no sequence chart reacts.
    const result = distributionFor(
      streamFromSd([...Array(10).fill(-1), ...Array(10).fill(1)]),
    );
    const centre = result.bins.find((bin) => bin.startZ <= 0 && bin.endZ > 0);

    expect(centre?.count ?? 0).toBe(0);
    // Band occupancy does NOT catch this, and that is the point. Two tight humps
    // inflate the pooled SD until every run sits inside 1 SD, so occupancy reads
    // over-concentrated rather than under — the opposite of a fat-tailed stream.
    // The empty centre bin is the only tell, which is why the panel draws the
    // shape instead of only reporting the percentages.
    expect(result.observed.oneSD).toBeGreaterThan(NORMAL_BAND_SHARE.oneSD);
  });

  it('reports the tallest bin', () => {
    const result = distributionFor(streamFromSd([0, 0, 0, 0, 2, -2]));

    expect(result.peakCount).toBe(Math.max(...result.bins.map((b) => b.count)));
    expect(result.peakCount).toBe(4);
  });

  it('survives a stream with no spread at all', () => {
    const result = distributionFor(streamFromSd([0, 0, 0, 0]));

    // SD is zero, so there is nothing to standardise against and the seeded SD
    // takes over rather than the function dividing by zero.
    expect(Number.isFinite(result.skewness)).toBe(true);
    expect(result.bins.reduce((total, bin) => total + bin.count, 0)).toBe(4);
  });
});
