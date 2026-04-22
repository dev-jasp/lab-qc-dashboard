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
