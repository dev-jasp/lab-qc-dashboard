import type { ChartDataPoint, QCParameters, QCRule, QCStatistics, WestgardRule } from '../types/qc.types';
import { DEFAULT_QC_RULES } from '../constants/qc-rules';

const DEFAULT_CV_WINDOW_SIZE = 10;
const DEFAULT_CV_THRESHOLD = 15;
const DEFAULT_RISING_DELTA = 1;
const DEFAULT_RISING_STEPS = 3;

export type RollingCVPoint = {
  endSample: string;
  endTimestamp: string;
  value: number;
  windowStartIndex: number;
  windowEndIndex: number;
};

export type SparklinePoint = {
  x: number;
  y: number;
  value: number;
  label: string;
};

export type CVTrendStatus = 'stable' | 'rising' | 'high' | 'insufficient_data';

export type CVTrendSummary = {
  currentCV: number | null;
  threshold: number;
  windowSize: number;
  status: CVTrendStatus;
  message: string;
  rollingCV: RollingCVPoint[];
  sparklinePoints: SparklinePoint[];
  isRising: boolean;
  isHigh: boolean;
};

const calculateMean = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

const calculateSampleStandardDeviation = (values: number[], mean: number): number => {
  if (values.length < 2) {
    return 0;
  }

  const variance =
    values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / (values.length - 1);

  return Math.sqrt(variance);
};

const calculateWindowCV = (values: number[]): number => {
  if (values.length < 2) {
    return 0;
  }

  const mean = calculateMean(values);

  if (mean === 0) {
    return 0;
  }

  const sd = calculateSampleStandardDeviation(values, mean);
  return (sd / mean) * 100;
};

const getResolvedMean = (statistics: QCStatistics, parameters: QCParameters, sampleCount: number): number =>
  sampleCount > 0 ? statistics.mean : parameters.targetMean;

const getResolvedSD = (statistics: QCStatistics, parameters: QCParameters, sampleCount: number): number =>
  sampleCount > 1 && statistics.sd > 0 ? statistics.sd : parameters.targetSD;

const setRuleResult = (
  rules: QCRule[],
  ruleName: WestgardRule,
  violated: boolean,
  triggeringIndices: number[] = [],
  status: QCRule['status'] = violated ? 'violated' : 'passed',
): void => {
  const targetRule = rules.find((rule) => rule.name === ruleName);

  if (targetRule) {
    targetRule.violated = violated;
    targetRule.status = status;
    targetRule.triggeringIndices = triggeringIndices;
  }
};

export const calculateStatistics = (data: ChartDataPoint[]): QCStatistics => {
  if (data.length === 0) {
    return { mean: 0, sd: 0, sampleCount: 0 };
  }

  const values = data.map((point) => point.value);
  const mean = calculateMean(values);
  const sd = calculateSampleStandardDeviation(values, mean);

  return {
    mean,
    sd,
    sampleCount: data.length
  };
};

export const evaluateQCRules = (
  data: ChartDataPoint[],
  statistics: QCStatistics,
  parameters: QCParameters
): QCRule[] => {
  const rules: QCRule[] = DEFAULT_QC_RULES.map((rule) => ({
    ...rule,
    violated: false,
    status: 'insufficient_data',
    triggeringIndices: [],
  }));

  if (data.length === 0) {
    return rules;
  }

  const values = data.map((point) => point.value);
  const mean = getResolvedMean(statistics, parameters, data.length);
  const sd = getResolvedSD(statistics, parameters, data.length);
  const minRunsForFullWestgard = 10;

  if (sd <= 0) {
    return rules.map((rule) => ({
      ...rule,
      status: data.length >= 2 ? 'passed' : 'insufficient_data',
    }));
  }

  if (data.length < minRunsForFullWestgard) {
    return rules;
  }

  const single12sIndices = values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Math.abs(value - mean) > 2 * sd)
    .map(({ index }) => index);
  setRuleResult(rules, '1_2s', single12sIndices.length > 0, single12sIndices);

  const single13sIndices = values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Math.abs(value - mean) > 3 * sd)
    .map(({ index }) => index);
  setRuleResult(rules, '1_3s', single13sIndices.length > 0, single13sIndices);

  let indices22s: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const currentZScore = (values[index] - mean) / sd;
    const previousZScore = (values[index - 1] - mean) / sd;

    if (
      (currentZScore > 2 && previousZScore > 2) ||
      (currentZScore < -2 && previousZScore < -2)
    ) {
      indices22s = [index - 1, index];
      break;
    }
  }
  setRuleResult(rules, '2_2s', indices22s.length > 0, indices22s);

  let indicesR4s: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index] - values[index - 1]) > 4 * sd) {
      indicesR4s = [index - 1, index];
      break;
    }
  }
  setRuleResult(rules, 'R_4s', indicesR4s.length > 0, indicesR4s);

  let indices41s: number[] = [];
  for (let index = 3; index < values.length; index += 1) {
    const lastFourValues = values.slice(index - 3, index + 1);
    const allAbovePositiveOneSD = lastFourValues.every((value) => (value - mean) / sd > 1);
    const allBelowNegativeOneSD = lastFourValues.every((value) => (value - mean) / sd < -1);

    if (allAbovePositiveOneSD || allBelowNegativeOneSD) {
      indices41s = [index - 3, index - 2, index - 1, index];
      break;
    }
  }
  setRuleResult(rules, '4_1s', indices41s.length > 0, indices41s);

  let indices10x: number[] = [];
  for (let index = 9; index < values.length; index += 1) {
    const lastTenValues = values.slice(index - 9, index + 1);
    const allAboveMean = lastTenValues.every((value) => value > mean);
    const allBelowMean = lastTenValues.every((value) => value < mean);

    if (allAboveMean || allBelowMean) {
      indices10x = Array.from({ length: 10 }, (_, offset) => index - 9 + offset);
      break;
    }
  }
  setRuleResult(rules, '10x', indices10x.length > 0, indices10x);

  let indices7T: number[] = [];
  for (let index = 6; index < values.length; index += 1) {
    const lastSevenValues = values.slice(index - 6, index + 1);
    let strictlyIncreasing = true;
    let strictlyDecreasing = true;

    for (let compareIndex = 1; compareIndex < lastSevenValues.length; compareIndex += 1) {
      if (lastSevenValues[compareIndex] <= lastSevenValues[compareIndex - 1]) {
        strictlyIncreasing = false;
      }

      if (lastSevenValues[compareIndex] >= lastSevenValues[compareIndex - 1]) {
        strictlyDecreasing = false;
      }
    }

    if (strictlyIncreasing || strictlyDecreasing) {
      indices7T = Array.from({ length: 7 }, (_, offset) => index - 6 + offset);
      break;
    }
  }
  setRuleResult(rules, '7T', indices7T.length > 0, indices7T);

  return rules;
};

export const calculateRollingCV = (
  data: ChartDataPoint[],
  windowSize: number = DEFAULT_CV_WINDOW_SIZE
): RollingCVPoint[] => {
  if (data.length < windowSize) {
    return [];
  }

  const rollingCV: RollingCVPoint[] = [];

  for (let endIndex = windowSize - 1; endIndex < data.length; endIndex += 1) {
    const startIndex = endIndex - (windowSize - 1);
    const window = data.slice(startIndex, endIndex + 1);
    const windowValues = window.map((point) => point.value);

    rollingCV.push({
      endSample: data[endIndex].sample,
      endTimestamp: data[endIndex].timestamp,
      value: calculateWindowCV(windowValues),
      windowStartIndex: startIndex,
      windowEndIndex: endIndex
    });
  }

  return rollingCV;
};

export const buildSparklinePoints = (
  values: RollingCVPoint[],
  width: number = 160,
  height: number = 48,
  padding: number = 4
): SparklinePoint[] => {
  if (values.length === 0) {
    return [];
  }

  const minValue = Math.min(...values.map((point) => point.value));
  const maxValue = Math.max(...values.map((point) => point.value));
  const range = maxValue - minValue || 1;
  const usableWidth = Math.max(width - padding * 2, 0);
  const usableHeight = Math.max(height - padding * 2, 0);

  return values.map((point, index) => {
    const ratio = values.length === 1 ? 0.5 : index / (values.length - 1);
    const normalizedValue = (point.value - minValue) / range;

    return {
      x: padding + ratio * usableWidth,
      y: height - padding - normalizedValue * usableHeight,
      value: point.value,
      label: point.endSample
    };
  });
};

export const evaluateCVTrend = (
  data: ChartDataPoint[],
  {
    windowSize = DEFAULT_CV_WINDOW_SIZE,
    threshold = DEFAULT_CV_THRESHOLD,
    riseDelta = DEFAULT_RISING_DELTA,
    risingSteps = DEFAULT_RISING_STEPS
  }: {
    windowSize?: number;
    threshold?: number;
    riseDelta?: number;
    risingSteps?: number;
  } = {}
): CVTrendSummary => {
  const rollingCV = calculateRollingCV(data, windowSize);
  const currentCV = rollingCV.length > 0 ? rollingCV[rollingCV.length - 1].value : null;
  const sparklinePoints = buildSparklinePoints(rollingCV);

  if (rollingCV.length === 0) {
    return {
      currentCV: null,
      threshold,
      windowSize,
      status: 'insufficient_data',
      message: `Rolling CV needs at least ${windowSize} runs before trend monitoring begins.`,
      rollingCV,
      sparklinePoints,
      isRising: false,
      isHigh: false
    };
  }

  const recentWindow = rollingCV.slice(-(risingSteps + 1));
  const isRising =
    recentWindow.length === risingSteps + 1 &&
    recentWindow
      .slice(1)
      .every((point, index) => point.value - recentWindow[index].value > riseDelta);

  const isHigh = currentCV !== null && currentCV > threshold;

  if (isHigh) {
    return {
      currentCV,
      threshold,
      windowSize,
      status: 'high',
      message: `Current rolling CV is above the ${threshold.toFixed(1)}% threshold.`,
      rollingCV,
      sparklinePoints,
      isRising,
      isHigh
    };
  }

  if (isRising) {
    return {
      currentCV,
      threshold,
      windowSize,
      status: 'rising',
      message: `Rolling CV has increased by more than ${riseDelta.toFixed(1)}% across ${risingSteps} consecutive windows.`,
      rollingCV,
      sparklinePoints,
      isRising,
      isHigh
    };
  }

  return {
    currentCV,
    threshold,
    windowSize,
    status: 'stable',
    message: 'Rolling CV is stable across the latest monitoring windows.',
    rollingCV,
    sparklinePoints,
    isRising,
    isHigh
  };
};

export const calculateZScore = (value: number, mean: number, sd: number): number => {
  if (sd === 0) {
    return 0;
  }

  return (value - mean) / sd;
};

export const getPointColor = (zScore: number): string => {
  const absZScore = Math.abs(zScore);

  if (absZScore > 3) return '#B22222';
  if (absZScore > 2) return '#FFA500';
  if (absZScore > 1) return '#A89F91';
  return '#0000FF';
};

/** Slack in SD units, absorbed before a deviation counts toward the sum. */
export const DEFAULT_CUSUM_SLACK = 0.5;
/** Decision interval in SD units. Overridden by QCSettings.cusumLimitMultiplier. */
export const DEFAULT_CUSUM_LIMIT = 5;

export type CUSUMPoint = {
  sample: string;
  timestamp: string;
  /** Standardised deviation of this run from the dataset mean. */
  zScore: number;
  /** Upper cumulative sum. Zero or positive; detects an upward shift. */
  upper: number;
  /** Lower cumulative sum. Zero or negative; detects a downward shift. */
  lower: number;
  /** True once either sum has run past the decision interval. */
  breached: boolean;
};

export type CUSUMResult = {
  points: CUSUMPoint[];
  /** Decision interval in SD units, mirrored for the chart's limit lines. */
  limit: number;
  slack: number;
  /** Index of the first run to breach, or null when the stream is in control. */
  firstBreachIndex: number | null;
};

/**
 * Tabular CUSUM over a control stream.
 *
 * Two one-sided cumulative sums of standardised deviations, each with a slack of
 * `k` SD absorbed before a run contributes. The slack is what makes this a drift
 * detector rather than a running total: ordinary scatter is absorbed, while a
 * persistent bias of even a fraction of an SD accumulates until it crosses the
 * decision interval `h`. That is the point of pairing it with Levey-Jennings —
 * a sustained 1 SD shift trips no Westgard rule for a long time, but CUSUM
 * catches it within a handful of runs.
 *
 * Sums are floored at zero (upper) and capped at zero (lower) so that a return to
 * target resets the evidence rather than carrying an old excursion forward.
 *
 * The caller supplies the dataset boundary: CUSUM is computed per lot for
 * positive/negative controls and per batch for in-house, because a reagent change
 * makes earlier deviations irrelevant to the current one.
 */
export const calculateCUSUM = (
  data: ChartDataPoint[],
  statistics: QCStatistics,
  parameters: QCParameters,
  limit: number = DEFAULT_CUSUM_LIMIT,
  slack: number = DEFAULT_CUSUM_SLACK,
): CUSUMResult => {
  const mean = data.length > 0 ? statistics.mean : parameters.targetMean;
  const sd =
    data.length > 1 && statistics.sd > 0 ? statistics.sd : parameters.targetSD;

  if (data.length === 0 || sd <= 0) {
    return { points: [], limit, slack, firstBreachIndex: null };
  }

  const points: CUSUMPoint[] = [];
  let upper = 0;
  let lower = 0;
  let firstBreachIndex: number | null = null;

  data.forEach((point, index) => {
    const zScore = (point.value - mean) / sd;

    upper = Math.max(0, upper + zScore - slack);
    lower = Math.min(0, lower + zScore + slack);

    const breached = upper > limit || lower < -limit;

    if (breached && firstBreachIndex === null) {
      firstBreachIndex = index;
    }

    points.push({
      sample: point.sample,
      timestamp: point.timestamp,
      zScore,
      upper,
      lower,
      breached,
    });
  });

  return { points, limit, slack, firstBreachIndex };
};

/**
 * Histogram bin width in SD units. Half an SD puts the mean and every ±1/2/3 SD
 * boundary exactly on a bin edge, so the reference lines never bisect a bar.
 */
export const OD_HISTOGRAM_BIN_SD = 0.5;

/** Share of a normal distribution inside ±1, ±2 and ±3 SD, as percentages. */
export const NORMAL_BAND_SHARE = {
  oneSD: 68.27,
  twoSD: 95.45,
  threeSD: 99.73,
} as const;

export type ODHistogramBin = {
  /** Bin bounds in OD units. */
  start: number;
  end: number;
  /** The same bounds in SD units from the mean. Integer multiples of the width. */
  startZ: number;
  endZ: number;
  /** Bin centre in SD units, which is where the bar is plotted. */
  midZ: number;
  count: number;
};

export type BandShare = {
  oneSD: number;
  twoSD: number;
  threeSD: number;
};

export type ODDistribution = {
  bins: ODHistogramBin[];
  /** Observed share of runs inside each band, as percentages. */
  observed: BandShare;
  /** Normal-theory expectation for the same bands. */
  expected: BandShare;
  /**
   * Sample skewness (bias-corrected Fisher-Pearson). Zero is symmetric; positive
   * means a tail towards high OD.
   */
  skewness: number;
  /** Tallest bin, so the caller can size the y axis. */
  peakCount: number;
  sampleCount: number;
};

const EMPTY_DISTRIBUTION: ODDistribution = {
  bins: [],
  observed: { oneSD: 0, twoSD: 0, threeSD: 0 },
  expected: NORMAL_BAND_SHARE,
  skewness: 0,
  peakCount: 0,
  sampleCount: 0,
};

/**
 * Distribution of OD values across the active dataset.
 *
 * Levey-Jennings, CUSUM and rolling CV all read the runs as a sequence. This
 * reads them as a population, which is the assumption the rest of the QC stack
 * rests on: ±2 SD is a warning only because ~95% of a normal distribution falls
 * inside it, and ±3 SD is an action limit only because ~99.7% does. When the
 * histogram comes back bimodal — two reagent populations, two operators, a
 * mid-series recalibration — those percentages are wrong and the Westgard limits
 * are being computed over a distribution that does not exist. No sequence chart
 * shows that, because both humps can sit comfortably inside the limits.
 *
 * Reported alongside the bars: observed versus normal-theory occupancy of each
 * band, and sample skewness. Those numbers are the point of the panel, and they
 * also discharge the contrast warning on the amber ±2 SD line — the reader never
 * has to resolve the band from colour alone.
 */
export const buildODDistribution = (
  data: ChartDataPoint[],
  statistics: QCStatistics,
  parameters: QCParameters,
): ODDistribution => {
  const mean = data.length > 0 ? statistics.mean : parameters.targetMean;
  const sd =
    data.length > 1 && statistics.sd > 0 ? statistics.sd : parameters.targetSD;

  if (data.length < 2 || sd <= 0) {
    return { ...EMPTY_DISTRIBUTION, sampleCount: data.length };
  }

  const zScores = data.map((point) => (point.value - mean) / sd);
  const width = OD_HISTOGRAM_BIN_SD;
  const firstEdge = Math.floor(Math.min(...zScores) / width) * width;
  const lastEdge = Math.ceil(Math.max(...zScores) / width) * width;
  // A dataset with no spread left, or one whose max sits exactly on an edge,
  // still needs a bin to land in.
  const binCount = Math.max(1, Math.round((lastEdge - firstEdge) / width));

  const counts = new Array<number>(binCount).fill(0);
  for (const z of zScores) {
    const raw = Math.floor((z - firstEdge) / width);
    counts[Math.min(binCount - 1, Math.max(0, raw))] += 1;
  }

  const bins: ODHistogramBin[] = counts.map((count, index) => {
    const startZ = firstEdge + index * width;
    const endZ = startZ + width;

    return {
      startZ,
      endZ,
      midZ: startZ + width / 2,
      start: mean + startZ * sd,
      end: mean + endZ * sd,
      count,
    };
  });

  const shareWithin = (limit: number): number =>
    (zScores.filter((z) => Math.abs(z) <= limit).length / zScores.length) * 100;

  // Bias-corrected sample skewness. The z-scores are already standardised by the
  // sample SD, so this reduces to the third-moment sum.
  const n = zScores.length;
  const skewness =
    n < 3
      ? 0
      : (n / ((n - 1) * (n - 2))) *
        zScores.reduce((total, z) => total + z ** 3, 0);

  return {
    bins,
    observed: {
      oneSD: shareWithin(1),
      twoSD: shareWithin(2),
      threeSD: shareWithin(3),
    },
    expected: NORMAL_BAND_SHARE,
    skewness,
    peakCount: Math.max(...counts),
    sampleCount: n,
  };
};
