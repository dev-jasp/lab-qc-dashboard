import { addBusinessDays, format, parseISO } from 'date-fns';

import type { ChartDataPoint, QCParameters } from '@/types/qc.types';

export type DiseaseSlug =
  | 'measles'
  | 'rubella'
  | 'rotavirus'
  | 'japanese-encephalitis'
  | 'dengue';

export type ControlSlug =
  | 'in-house-control'
  | 'positive-control'
  | 'negative-control';

export type ControlTone = 'normal' | 'warning' | 'critical';

type ControlDefinition = {
  slug: ControlSlug;
  label: string;
  shortLabel: string;
};

type DiseaseControlSummary = {
  control: ControlSlug;
  tone: ControlTone;
  note: string;
};

type DiseaseDefinition = {
  slug: DiseaseSlug;
  name: string;
  assayTag: string;
  description: string;
  summary: string;
  featured?: boolean;
  controls: DiseaseControlSummary[];
};

type MonitorSeed = {
  parameters: QCParameters;
  data: ChartDataPoint[];
  seedVersion?: string;
  lotNumber?: string;
  lotStartDate?: string;
};

export const CONTROL_DEFINITIONS: ControlDefinition[] = [
  { slug: 'in-house-control', label: 'In-house Control', shortLabel: 'In-house' },
  { slug: 'positive-control', label: 'Positive Control', shortLabel: 'Positive' },
  { slug: 'negative-control', label: 'Negative Control', shortLabel: 'Negative' },
];

export const DISEASE_DEFINITIONS: DiseaseDefinition[] = [
  {
    slug: 'measles',
    name: 'Measles',
    assayTag: 'IGM ELISA',
    description: 'Routine IgM surveillance for national reference confirmation and QC trending.',
    summary: 'Three-control surveillance set aligned to the measles serology workflow.',
    controls: [
      { control: 'in-house-control', tone: 'normal', note: 'In-house control' },
      { control: 'positive-control', tone: 'normal', note: 'Positive control' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
  {
    slug: 'rubella',
    name: 'Rubella',
    assayTag: 'IGM ELISA',
    description: 'Rubella confirmation workflow with positive-control drift monitoring.',
    summary: 'Supervisor overview for all three rubella QC control streams.',
    controls: [
      { control: 'in-house-control', tone: 'critical', note: 'In-house control (R_4s, rising CV)' },
      { control: 'positive-control', tone: 'warning', note: 'Positive control (10x)' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
  {
    slug: 'rotavirus',
    name: 'Rotavirus',
    assayTag: 'STOOL PCR',
    description: 'Molecular QC monitoring for stool PCR extraction and amplification steps.',
    summary: 'Real-time assay stability across in-house, positive, and negative controls.',
    controls: [
      { control: 'in-house-control', tone: 'warning', note: 'In-house control (7T trend)' },
      { control: 'positive-control', tone: 'normal', note: 'Positive control' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
  {
    slug: 'japanese-encephalitis',
    name: 'Japanese Encephalitis',
    assayTag: 'CSF MAC-ELISA',
    description: 'Monitoring IgM levels across sentinel sites with automated Levey-Jennings review.',
    summary: 'Higher-risk surveillance lane highlighting out-of-bounds in-house performance.',
    featured: true,
    controls: [
      { control: 'in-house-control', tone: 'critical', note: 'In-house control (1_3s, upward drift)' },
      { control: 'positive-control', tone: 'normal', note: 'Positive control' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
  {
    slug: 'dengue',
    name: 'Dengue',
    assayTag: 'NS1 / IGM',
    description: 'Dual-marker QC surveillance for NS1 antigen and IgM confirmation lots.',
    summary: 'Combined serology control set supporting dengue surveillance readiness.',
    controls: [
      { control: 'in-house-control', tone: 'critical', note: 'In-house control (2_2s after shift)' },
      { control: 'positive-control', tone: 'critical', note: 'Positive control (1_3s, R_4s)' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
];

/**
 * Seeded demo data.
 *
 * Every stream is generated from a deterministic PRNG so the same numbers appear
 * on every machine and every run. That reproducibility is what lets
 * `monitor-config.test.ts` assert the QC story each stream is supposed to tell.
 * Each stream carries a deliberate narrative — stable, drifting, rising-CV, or a
 * specific rule breach — so the Levey-Jennings, CUSUM, rolling-CV, and Pareto
 * views all have something real to show on a cold load.
 */
const SEED_START_DATE = '2026-01-05';

/** FNV-1a. Gives each stream a stable, distinct noise sequence from its key. */
const hashSeedKey = (value: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/** mulberry32 — small, fast, and reproducible across machines. */
const createSeededRandom = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Shape of the random scatter within a segment.
 *
 * `normalish` sums three uniforms, which approximates a normal distribution and so
 * produces the occasional far-from-mean run that real QC data shows.
 *
 * `bounded` is a single uniform. Scaled to unit SD its extreme is ±√3 ≈ 1.73 SD by
 * construction, so a stream built entirely from bounded segments cannot trip `1_2s`
 * — or anything stricter — at any scale. That is the only way to guarantee a stream
 * stays visibly in control, because the Westgard engine resolves its SD from the
 * dataset itself: shrinking the scatter shrinks the SD with it and leaves the
 * z-scores unchanged. The distribution's shape is what matters, not its size.
 */
type SeedNoise = 'normalish' | 'bounded';

type SeedSegment = {
  /** How many runs this segment contributes to the stream. */
  runs: number;
  /** Segment start, as a multiple of the target SD away from the target mean. */
  fromSd?: number;
  /** Segment end, in SD units. Defaults to `fromSd`, meaning no drift. */
  toSd?: number;
  /** Random scatter at the segment start, in SD units. */
  scatterFrom?: number;
  /** Random scatter at the segment end. Defaults to `scatterFrom`. */
  scatterTo?: number;
  /** Scatter distribution. Defaults to `normalish`. */
  noise?: SeedNoise;
  /** Exact offsets in SD units keyed by index within the segment, overriding scatter. */
  fixedSd?: Record<number, number>;
};

const ROOT_THREE = Math.sqrt(3);

/** Both variants are centred on zero and scaled to unit standard deviation. */
const nextNoise = (random: () => number, noise: SeedNoise): number =>
  noise === 'bounded'
    ? (random() * 2 - 1) * ROOT_THREE
    : (random() + random() + random() - 1.5) * 2;

const buildStreamSeries = (
  streamKey: string,
  prefix: string | null,
  parameters: QCParameters,
  segments: SeedSegment[],
): ChartDataPoint[] => {
  const random = createSeededRandom(hashSeedKey(streamKey));
  const startDate = parseISO(SEED_START_DATE);
  const points: ChartDataPoint[] = [];
  let runIndex = 0;

  for (const segment of segments) {
    const fromSd = segment.fromSd ?? 0;
    const toSd = segment.toSd ?? fromSd;
    const scatterFrom = segment.scatterFrom ?? 1;
    const scatterTo = segment.scatterTo ?? scatterFrom;

    for (let step = 0; step < segment.runs; step += 1) {
      const progress = segment.runs === 1 ? 0 : step / (segment.runs - 1);
      const centreSd = fromSd + (toSd - fromSd) * progress;
      const scatter = scatterFrom + (scatterTo - scatterFrom) * progress;
      // Drawn unconditionally so a `fixedSd` override cannot shift the sequence.
      const noise = nextNoise(random, segment.noise ?? 'normalish');
      const fixedSd = segment.fixedSd?.[step];
      const offsetSd = fixedSd ?? centreSd + noise * scatter;
      const value = parameters.targetMean + parameters.targetSD * offsetSd;

      points.push({
        sample:
          prefix === null ? `${runIndex + 1}` : `${prefix}-${String(runIndex + 1).padStart(3, '0')}`,
        value: Number(value.toFixed(4)),
        timestamp: format(addBusinessDays(startDate, runIndex), 'yyyy-MM-dd'),
      });

      runIndex += 1;
    }
  }

  return points;
};

const MEASLES_IN_HOUSE: QCParameters = { targetMean: 2.15, targetSD: 0.05 };
const MEASLES_POSITIVE: QCParameters = { targetMean: 2.35, targetSD: 0.06 };
const MEASLES_NEGATIVE: QCParameters = { targetMean: 1.05, targetSD: 0.04 };
const RUBELLA_IN_HOUSE: QCParameters = { targetMean: 1.92, targetSD: 0.05 };
const RUBELLA_POSITIVE: QCParameters = { targetMean: 2.26, targetSD: 0.05 };
const RUBELLA_NEGATIVE: QCParameters = { targetMean: 0.94, targetSD: 0.03 };
const ROTAVIRUS_IN_HOUSE: QCParameters = { targetMean: 1.68, targetSD: 0.04 };
const ROTAVIRUS_POSITIVE: QCParameters = { targetMean: 2.52, targetSD: 0.05 };
const ROTAVIRUS_NEGATIVE: QCParameters = { targetMean: 0.82, targetSD: 0.03 };
const JE_IN_HOUSE: QCParameters = { targetMean: 2.41, targetSD: 0.05 };
const JE_POSITIVE: QCParameters = { targetMean: 2.62, targetSD: 0.05 };
const JE_NEGATIVE: QCParameters = { targetMean: 1.02, targetSD: 0.03 };
const DENGUE_IN_HOUSE: QCParameters = { targetMean: 1.74, targetSD: 0.04 };
const DENGUE_POSITIVE: QCParameters = { targetMean: 2.18, targetSD: 0.05 };
const DENGUE_NEGATIVE: QCParameters = { targetMean: 0.88, targetSD: 0.03 };

const MONITOR_SEEDS: Record<DiseaseSlug, Record<ControlSlug, MonitorSeed>> = {
  measles: {
    'in-house-control': {
      parameters: MEASLES_IN_HOUSE,
      seedVersion: 'measles-in-house-story-v3',
      // Deliberately uneventful. Measles is the reference "everything is fine"
      // disease, so all three of its streams use bounded scatter and trip nothing.
      // The gentle scatter variation keeps the chart from looking synthetic
      // without ever reaching 2 SD.
      data: buildStreamSeries('measles:in-house-control', null, MEASLES_IN_HOUSE, [
        { runs: 30, scatterFrom: 0.92, noise: 'bounded' },
        { runs: 24, scatterFrom: 0.96, scatterTo: 1.05, noise: 'bounded' },
        { runs: 18, scatterFrom: 1.02, scatterTo: 0.9, noise: 'bounded' },
      ]),
    },
    'positive-control': {
      parameters: MEASLES_POSITIVE,
      seedVersion: 'measles-positive-story-v3',
      data: buildStreamSeries('measles:positive-control', 'MEA-PC', MEASLES_POSITIVE, [
        { runs: 72, scatterFrom: 0.95, noise: 'bounded' },
      ]),
      lotNumber: 'E240423AS',
      lotStartDate: SEED_START_DATE,
    },
    'negative-control': {
      parameters: MEASLES_NEGATIVE,
      seedVersion: 'measles-negative-story-v3',
      data: buildStreamSeries('measles:negative-control', 'MEA-NC', MEASLES_NEGATIVE, [
        { runs: 72, scatterFrom: 0.9, noise: 'bounded' },
      ]),
      lotNumber: 'E240423AS',
      lotStartDate: SEED_START_DATE,
    },
  },
  rubella: {
    'in-house-control': {
      parameters: RUBELLA_IN_HOUSE,
      seedVersion: 'rubella-in-house-story-v3',
      // Imprecision creeps in mid-series and is brought back under control: this is
      // the stream the rolling-CV chart is meant to visibly bend on.
      data: buildStreamSeries('rubella:in-house-control', 'RUB-IH', RUBELLA_IN_HOUSE, [
        { runs: 34, scatterFrom: 0.75 },
        { runs: 22, scatterFrom: 0.8, scatterTo: 1.35 },
        { runs: 16, scatterFrom: 1.28, scatterTo: 0.9 },
      ]),
    },
    'positive-control': {
      parameters: RUBELLA_POSITIVE,
      seedVersion: 'rubella-positive-story-v2',
      // A sustained run above the mean (10x) plus a later 1_2s — both warnings,
      // matching this stream's declared 'warning' tone.
      data: buildStreamSeries('rubella:positive-control', 'RUB-PC', RUBELLA_POSITIVE, [
        { runs: 40, scatterFrom: 0.7 },
        { runs: 12, fromSd: 0.38, toSd: 0.5, scatterFrom: 0.15 },
        { runs: 20, scatterFrom: 0.7, fixedSd: { 8: 1.65 } },
      ]),
      lotNumber: 'R240315BX',
      lotStartDate: SEED_START_DATE,
    },
    'negative-control': {
      parameters: RUBELLA_NEGATIVE,
      seedVersion: 'rubella-negative-story-v2',
      data: buildStreamSeries('rubella:negative-control', 'RUB-NC', RUBELLA_NEGATIVE, [
        { runs: 72, scatterFrom: 0.65 },
      ]),
      lotNumber: 'R240315BX',
      lotStartDate: SEED_START_DATE,
    },
  },
  rotavirus: {
    'in-house-control': {
      parameters: ROTAVIRUS_IN_HOUSE,
      seedVersion: 'rotavirus-in-house-story-v2',
      // Eight strictly increasing runs trip the 7T trend rule.
      data: buildStreamSeries('rotavirus:in-house-control', 'ROT-IH', ROTAVIRUS_IN_HOUSE, [
        { runs: 45, scatterFrom: 0.7 },
        {
          runs: 8,
          fixedSd: { 0: -0.95, 1: -0.68, 2: -0.4, 3: -0.12, 4: 0.16, 5: 0.44, 6: 0.72, 7: 1.0 },
        },
        { runs: 19, scatterFrom: 0.7 },
      ]),
    },
    'positive-control': {
      parameters: ROTAVIRUS_POSITIVE,
      seedVersion: 'rotavirus-positive-story-v2',
      data: buildStreamSeries('rotavirus:positive-control', 'ROT-PC', ROTAVIRUS_POSITIVE, [
        { runs: 72, scatterFrom: 0.7 },
      ]),
      lotNumber: 'RV240401CT',
      lotStartDate: SEED_START_DATE,
    },
    'negative-control': {
      parameters: ROTAVIRUS_NEGATIVE,
      seedVersion: 'rotavirus-negative-story-v2',
      data: buildStreamSeries('rotavirus:negative-control', 'ROT-NC', ROTAVIRUS_NEGATIVE, [
        { runs: 72, scatterFrom: 0.6 },
      ]),
      lotNumber: 'RV240401CT',
      lotStartDate: SEED_START_DATE,
    },
  },
  'japanese-encephalitis': {
    'in-house-control': {
      parameters: JE_IN_HOUSE,
      seedVersion: 'japanese-encephalitis-in-house-story-v2',
      // The flagship stream: a long systematic upward drift that CUSUM catches
      // well before Levey-Jennings does, closing on a 1_3s rejection.
      data: buildStreamSeries('japanese-encephalitis:in-house-control', 'JE-IH', JE_IN_HOUSE, [
        { runs: 40, scatterFrom: 0.7 },
        { runs: 22, fromSd: 0.1, toSd: 1.5, scatterFrom: 0.45 },
        { runs: 10, fromSd: 1.6, scatterFrom: 0.5, fixedSd: { 5: 3.35 } },
      ]),
    },
    'positive-control': {
      parameters: JE_POSITIVE,
      seedVersion: 'japanese-encephalitis-positive-story-v2',
      data: buildStreamSeries('japanese-encephalitis:positive-control', 'JE-PC', JE_POSITIVE, [
        { runs: 72, scatterFrom: 0.7 },
      ]),
      lotNumber: 'JE240408DL',
      lotStartDate: SEED_START_DATE,
    },
    'negative-control': {
      parameters: JE_NEGATIVE,
      seedVersion: 'japanese-encephalitis-negative-story-v2',
      data: buildStreamSeries('japanese-encephalitis:negative-control', 'JE-NC', JE_NEGATIVE, [
        { runs: 72, scatterFrom: 0.6 },
      ]),
      lotNumber: 'JE240408DL',
      lotStartDate: SEED_START_DATE,
    },
  },
  dengue: {
    'in-house-control': {
      parameters: DENGUE_IN_HOUSE,
      seedVersion: 'dengue-in-house-story-v2',
      // An abrupt step change downward — a reagent-shift signature rather than a drift.
      data: buildStreamSeries('dengue:in-house-control', 'DEN-IH', DENGUE_IN_HOUSE, [
        { runs: 38, scatterFrom: 0.7 },
        { runs: 14, fromSd: -0.62, scatterFrom: 0.22 },
        { runs: 20, scatterFrom: 0.7 },
      ]),
    },
    'positive-control': {
      parameters: DENGUE_POSITIVE,
      seedVersion: 'dengue-positive-story-v2',
      // Two adjacent runs on opposite sides of the mean trip R_4s.
      data: buildStreamSeries('dengue:positive-control', 'DEN-PC', DENGUE_POSITIVE, [
        { runs: 46, scatterFrom: 0.65 },
        { runs: 4, fixedSd: { 0: -2.15, 1: 2.15 } },
        { runs: 22, scatterFrom: 0.65 },
      ]),
      lotNumber: 'DG240512EM',
      lotStartDate: SEED_START_DATE,
    },
    'negative-control': {
      parameters: DENGUE_NEGATIVE,
      seedVersion: 'dengue-negative-story-v2',
      data: buildStreamSeries('dengue:negative-control', 'DEN-NC', DENGUE_NEGATIVE, [
        { runs: 72, scatterFrom: 0.6 },
      ]),
      lotNumber: 'DG240512EM',
      lotStartDate: SEED_START_DATE,
    },
  },
};

export type ControlTabSlug = 'in-house' | 'positive' | 'negative';

const CONTROL_TAB_TO_TYPE: Record<ControlTabSlug, ControlSlug> = {
  'in-house': 'in-house-control',
  positive: 'positive-control',
  negative: 'negative-control',
};

const CONTROL_TYPE_TO_TAB: Record<ControlSlug, ControlTabSlug> = {
  'in-house-control': 'in-house',
  'positive-control': 'positive',
  'negative-control': 'negative',
};

export function controlTabSlugToType(slug: string): ControlSlug | null {
  return (CONTROL_TAB_TO_TYPE as Record<string, ControlSlug>)[slug] ?? null;
}

export function controlTypeToTabSlug(slug: ControlSlug): ControlTabSlug {
  return CONTROL_TYPE_TO_TAB[slug];
}

export const getDiseaseDefinition = (slug: string | undefined): DiseaseDefinition | undefined =>
  DISEASE_DEFINITIONS.find((disease) => disease.slug === slug);

export const getControlDefinition = (slug: string | undefined): ControlDefinition | undefined =>
  CONTROL_DEFINITIONS.find((control) => control.slug === slug);

export const getControlMonitorSeed = (
  disease: DiseaseSlug,
  control: ControlSlug,
): MonitorSeed => MONITOR_SEEDS[disease][control];

export const getDiseaseControls = (disease: DiseaseSlug) =>
  CONTROL_DEFINITIONS.map((control) => ({
    ...control,
    ...MONITOR_SEEDS[disease][control.slug],
    tone: DISEASE_DEFINITIONS.find((item) => item.slug === disease)?.controls.find(
      (summary) => summary.control === control.slug,
    )?.tone ?? 'normal',
    note: DISEASE_DEFINITIONS.find((item) => item.slug === disease)?.controls.find(
      (summary) => summary.control === control.slug,
    )?.note ?? control.label,
  }));

