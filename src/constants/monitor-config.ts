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
      { control: 'in-house-control', tone: 'normal', note: 'In-house control' },
      { control: 'positive-control', tone: 'warning', note: 'Positive control (2SD)' },
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
      { control: 'in-house-control', tone: 'normal', note: 'In-house control' },
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
      { control: 'in-house-control', tone: 'critical', note: 'In-house control (out of bounds)' },
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
      { control: 'in-house-control', tone: 'normal', note: 'In-house control' },
      { control: 'positive-control', tone: 'normal', note: 'Positive control' },
      { control: 'negative-control', tone: 'normal', note: 'Negative control' },
    ],
  },
];

const buildSeries = (prefix: string, values: number[], dayOffset: number): ChartDataPoint[] =>
  values.map((value, index) => ({
    sample: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    value,
    timestamp: `2026-03-${String(dayOffset + index).padStart(2, '0')}`,
  }));

const MONITOR_SEEDS: Record<DiseaseSlug, Record<ControlSlug, MonitorSeed>> = {
  measles: {
    'in-house-control': {
      parameters: { targetMean: 2.15, targetSD: 0.05 },
      data: buildSeries('MEA-IH', [2.12, 2.16, 2.09, 2.18, 2.24, 2.14, 2.12, 2.17, 2.21, 2.19], 1),
    },
    'positive-control': {
      parameters: { targetMean: 2.35, targetSD: 0.06 },
      data: buildSeries('MEA-PC', [2.31, 2.34, 2.38, 2.42, 2.36, 2.33, 2.39, 2.41, 2.37, 2.35], 1),
    },
    'negative-control': {
      parameters: { targetMean: 1.05, targetSD: 0.04 },
      data: buildSeries('MEA-NC', [1.01, 1.03, 1.06, 1.04, 1.02, 1.05, 1.07, 1.04, 1.03, 1.02], 1),
    },
  },
  rubella: {
    'in-house-control': {
      parameters: { targetMean: 1.92, targetSD: 0.05 },
      data: buildSeries('RUB-IH', [1.9, 1.93, 1.89, 1.95, 1.97, 1.92, 1.91, 1.94, 1.96, 1.93], 2),
    },
    'positive-control': {
      parameters: { targetMean: 2.26, targetSD: 0.05 },
      data: buildSeries('RUB-PC', [2.23, 2.28, 2.31, 2.36, 2.38, 2.35, 2.3, 2.32, 2.29, 2.27], 2),
    },
    'negative-control': {
      parameters: { targetMean: 0.94, targetSD: 0.03 },
      data: buildSeries('RUB-NC', [0.92, 0.94, 0.95, 0.93, 0.94, 0.96, 0.95, 0.93, 0.94, 0.92], 2),
    },
  },
  rotavirus: {
    'in-house-control': {
      parameters: { targetMean: 1.68, targetSD: 0.04 },
      data: buildSeries('ROT-IH', [1.67, 1.7, 1.66, 1.72, 1.69, 1.68, 1.71, 1.7, 1.69, 1.68], 3),
    },
    'positive-control': {
      parameters: { targetMean: 2.52, targetSD: 0.05 },
      data: buildSeries('ROT-PC', [2.49, 2.51, 2.55, 2.54, 2.52, 2.56, 2.58, 2.55, 2.53, 2.52], 3),
    },
    'negative-control': {
      parameters: { targetMean: 0.82, targetSD: 0.03 },
      data: buildSeries('ROT-NC', [0.8, 0.81, 0.84, 0.82, 0.83, 0.81, 0.82, 0.84, 0.83, 0.82], 3),
    },
  },
  'japanese-encephalitis': {
    'in-house-control': {
      parameters: { targetMean: 2.41, targetSD: 0.05 },
      data: buildSeries('JE-IH', [2.38, 2.43, 2.48, 2.54, 2.6, 2.57, 2.51, 2.46, 2.44, 2.42], 4),
    },
    'positive-control': {
      parameters: { targetMean: 2.62, targetSD: 0.05 },
      data: buildSeries('JE-PC', [2.59, 2.61, 2.65, 2.63, 2.62, 2.66, 2.64, 2.63, 2.62, 2.61], 4),
    },
    'negative-control': {
      parameters: { targetMean: 1.02, targetSD: 0.03 },
      data: buildSeries('JE-NC', [1.0, 1.02, 1.03, 1.01, 1.02, 1.04, 1.03, 1.02, 1.01, 1.0], 4),
    },
  },
  dengue: {
    'in-house-control': {
      parameters: { targetMean: 1.74, targetSD: 0.04 },
      data: buildSeries('DEN-IH', [1.71, 1.74, 1.72, 1.76, 1.79, 1.75, 1.74, 1.77, 1.75, 1.73], 5),
    },
    'positive-control': {
      parameters: { targetMean: 2.18, targetSD: 0.05 },
      data: buildSeries('DEN-PC', [2.15, 2.19, 2.21, 2.2, 2.18, 2.22, 2.24, 2.2, 2.19, 2.18], 5),
    },
    'negative-control': {
      parameters: { targetMean: 0.88, targetSD: 0.03 },
      data: buildSeries('DEN-NC', [0.86, 0.89, 0.87, 0.9, 0.88, 0.89, 0.91, 0.88, 0.87, 0.86], 5),
    },
  },
};

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

