export type GlossaryCategoryId =
  | 'chart-statistics'
  | 'control-types'
  | 'status-flags'
  | 'cv-trend'
  | 'lot-management';

export type GlossarySeverity = 'valid' | 'warning' | 'rejection';

export type GlossaryCategory = {
  id: GlossaryCategoryId;
  label: string;
  description: string;
};

export type GlossaryEntry = {
  id: string;
  term: string;
  aliases: string[];
  categoryId: GlossaryCategoryId;
  definition: string;
  severity?: GlossarySeverity;
  relatedTermIds: string[];
};

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  {
    id: 'chart-statistics',
    label: 'Chart & Statistics',
    description: 'Core Levey-Jennings, OD, statistics, and Westgard terminology used in daily QC review.',
  },
  {
    id: 'control-types',
    label: 'Control Types',
    description: 'Definitions for the three control streams used across disease monitors.',
  },
  {
    id: 'status-flags',
    label: 'Status & Flags',
    description: 'Operational status labels and rule log terms used for review, escalation, and traceability.',
  },
  {
    id: 'cv-trend',
    label: 'CV Trend',
    description: 'Precision and variability terms used to monitor assay consistency across recent runs.',
  },
  {
    id: 'lot-management',
    label: 'Lot Management',
    description: 'Reagent lot terms used to keep positive and negative control comparisons meaningful.',
  },
];

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    id: 'od',
    term: 'OD (Optical Density)',
    aliases: ['absorbance', 'od value', 'optical density'],
    categoryId: 'chart-statistics',
    definition:
      'A numeric measurement that reflects how much light is absorbed by a sample during the assay. In ELISA-based testing, higher OD values typically indicate stronger reactivity.',
    relatedTermIds: ['od-mean', 'standard-deviation', 'cv'],
  },
  {
    id: 'od-mean',
    term: 'OD Mean',
    aliases: ['mean', 'average od', 'baseline'],
    categoryId: 'chart-statistics',
    definition:
      'The calculated average of all OD readings within the current data set. It serves as the central baseline from which standard deviation limits are derived and plotted on the Levey-Jennings chart.',
    relatedTermIds: ['od', 'standard-deviation', 'westgard-rules'],
  },
  {
    id: 'standard-deviation',
    term: 'Standard Deviation (SD)',
    aliases: ['sd', '+/-1sd', '+/-2sd', '+/-3sd'],
    categoryId: 'chart-statistics',
    definition:
      'A statistical measure of how much individual OD readings vary from the mean. In quality control, +/-1SD, +/-2SD, and +/-3SD boundaries define acceptable performance zones. The further a result strays from the mean, the more likely it signals a process issue.',
    relatedTermIds: ['od-mean', 'westgard-rules', 'cv'],
  },
  {
    id: 'westgard-rules',
    term: 'Westgard Rules',
    aliases: ['qc rules', 'westgard', 'rule checks'],
    categoryId: 'chart-statistics',
    definition:
      'A set of internationally recognized statistical rules used to evaluate whether a QC run is in-control or out-of-control. Each rule targets a specific pattern of variation, helping distinguish random error from systematic problems.',
    relatedTermIds: ['rule-1-2s', 'rule-1-3s', 'rule-2-2s', 'rule-r-4s', 'rule-4-1s', 'rule-10x'],
  },
  {
    id: 'rule-1-2s',
    term: '1₂s',
    aliases: ['1_2s', '1-2s', 'one two s', 'warning rule'],
    categoryId: 'chart-statistics',
    definition: 'One control value exceeds +/-2SD. Treated as a warning; does not automatically reject the run.',
    severity: 'warning',
    relatedTermIds: ['westgard-rules', 'warning', 'standard-deviation'],
  },
  {
    id: 'rule-1-3s',
    term: '1₃s',
    aliases: ['1_3s', '1-3s', 'one three s', 'rejection rule'],
    categoryId: 'chart-statistics',
    definition: 'One control value exceeds +/-3SD. Indicates probable random error; the run is rejected.',
    severity: 'rejection',
    relatedTermIds: ['westgard-rules', 'rejected', 'standard-deviation'],
  },
  {
    id: 'rule-2-2s',
    term: '2₂s',
    aliases: ['2_2s', '2-2s', 'two two s', 'shift'],
    categoryId: 'chart-statistics',
    definition: 'Two consecutive values exceed +/-2SD on the same side. Suggests systematic shift; the run is rejected.',
    severity: 'rejection',
    relatedTermIds: ['westgard-rules', 'rejected', 'standard-deviation'],
  },
  {
    id: 'rule-r-4s',
    term: 'R₄s',
    aliases: ['r_4s', 'r-4s', 'range rule', 'random error'],
    categoryId: 'chart-statistics',
    definition: 'The range between two consecutive values exceeds 4SD. Indicates excessive random error; the run is rejected.',
    severity: 'rejection',
    relatedTermIds: ['westgard-rules', 'rejected', 'standard-deviation'],
  },
  {
    id: 'rule-4-1s',
    term: '4₁s',
    aliases: ['4_1s', '4-1s', 'four one s', 'drift'],
    categoryId: 'chart-statistics',
    definition: 'Four consecutive values fall beyond +/-1SD on the same side. Signals a gradual systematic drift.',
    severity: 'rejection',
    relatedTermIds: ['westgard-rules', 'rejected', 'standard-deviation'],
  },
  {
    id: 'rule-10x',
    term: '10x',
    aliases: ['ten x', 'same side mean', 'directional bias'],
    categoryId: 'chart-statistics',
    definition:
      'Ten consecutive values fall on the same side of the mean, regardless of SD. Indicates a sustained directional bias in the process.',
    severity: 'warning',
    relatedTermIds: ['westgard-rules', 'warning', 'od-mean'],
  },
  {
    id: 'protocol-number',
    term: 'Protocol No.',
    aliases: ['protocol number', 'protocol', 'run identifier'],
    categoryId: 'chart-statistics',
    definition:
      'A unique identifier assigned to each individual QC run. It tracks the sequence of runs over time and is used for referencing specific entries in the run history and audit logs. It is distinct from a lot number.',
    relatedTermIds: ['lot-number', 'rule-logs'],
  },
  {
    id: 'in-house-control',
    term: 'In-house Control',
    aliases: ['inhouse control', 'lab prepared control', 'continuous control'],
    categoryId: 'control-types',
    definition:
      'A laboratory-prepared control material used to monitor the consistency of the assay over time. Unlike commercial controls, it is continuous and never resets between lots, making it the most reliable indicator of long-term process stability.',
    relatedTermIds: ['positive-control', 'negative-control', 'cv-trend'],
  },
  {
    id: 'positive-control',
    term: 'Positive Control',
    aliases: ['reactive control', 'commercial positive control'],
    categoryId: 'control-types',
    definition:
      'A commercially prepared sample known to produce a reactive result. It confirms that the assay is functioning correctly and is capable of detecting the target analyte. QC data for the positive control is tracked within each reagent lot and resets when a new lot is introduced.',
    relatedTermIds: ['negative-control', 'lot-number', 'lot-expiry'],
  },
  {
    id: 'negative-control',
    term: 'Negative Control',
    aliases: ['non-reactive control', 'commercial negative control'],
    categoryId: 'control-types',
    definition:
      'A commercially prepared sample expected to produce a non-reactive result. It verifies that the assay is not generating false positives due to contamination or reagent issues. Like the positive control, its QC data is scoped to the current reagent lot.',
    relatedTermIds: ['positive-control', 'lot-number', 'lot-expiry'],
  },
  {
    id: 'valid',
    term: 'Valid',
    aliases: ['in control', 'accepted', 'usable'],
    categoryId: 'status-flags',
    definition:
      'The QC run meets all Westgard rule criteria and the result falls within acceptable limits. The run may be used for reporting purposes.',
    severity: 'valid',
    relatedTermIds: ['westgard-rules', 'warning', 'rejected'],
  },
  {
    id: 'warning',
    term: 'Warning',
    aliases: ['watchlist', 'non rejection', '1_2s'],
    categoryId: 'status-flags',
    definition:
      'The QC run triggered a non-rejection rule, typically 1₂s. The result is still usable, but the pattern warrants close monitoring to detect early signs of drift or instability.',
    severity: 'warning',
    relatedTermIds: ['rule-1-2s', 'valid', 'rejected'],
  },
  {
    id: 'rejected',
    term: 'Rejected',
    aliases: ['out of control', 'rejection', 'failed qc'],
    categoryId: 'status-flags',
    definition:
      'The QC run violated one or more rejection rules. The run should not be used for reporting, and corrective action must be taken and documented before testing resumes.',
    severity: 'rejection',
    relatedTermIds: ['rule-1-3s', 'rule-2-2s', 'rule-r-4s', 'rule-4-1s'],
  },
  {
    id: 'recent-flags',
    term: 'Recent Flags',
    aliases: ['flags', 'recent warnings', 'recent violations'],
    categoryId: 'status-flags',
    definition:
      'A log of QC runs that triggered any Westgard rule within recent activity. Flags are raised automatically when a result meets rule criteria, and serve as early indicators that require review or investigation.',
    relatedTermIds: ['rule-logs', 'westgard-rules', 'warning'],
  },
  {
    id: 'rule-logs',
    term: 'Rule Logs',
    aliases: ['violation logs', 'audit logs', 'westgard log'],
    categoryId: 'status-flags',
    definition:
      'A complete, timestamped record of all Westgard rule violations and warnings for a given control. Rule logs support traceability, internal audits, and accreditation reviews by providing documented evidence of QC monitoring.',
    relatedTermIds: ['recent-flags', 'westgard-rules', 'protocol-number'],
  },
  {
    id: 'cv',
    term: 'CV (Coefficient of Variation)',
    aliases: ['coefficient of variation', 'percent cv', 'cv percentage'],
    categoryId: 'cv-trend',
    definition:
      'A percentage that expresses the degree of variability in OD readings relative to the mean. A lower CV indicates greater assay precision. It is calculated as (SD / Mean) x 100.',
    relatedTermIds: ['standard-deviation', 'od-mean', 'cv-threshold'],
  },
  {
    id: 'cv-trend',
    term: 'CV Trend',
    aliases: ['rolling cv', 'precision trend', 'variability trend'],
    categoryId: 'cv-trend',
    definition:
      'A visual representation of how the CV has changed across recent runs. A rising trend may indicate increasing assay variability, reagent degradation, or operator inconsistency, while a stable or declining trend reflects consistent performance.',
    relatedTermIds: ['cv', 'cv-threshold', 'in-house-control'],
  },
  {
    id: 'cv-threshold',
    term: 'CV Threshold',
    aliases: ['cv limit', 'precision threshold', 'maximum cv'],
    categoryId: 'cv-trend',
    definition:
      'The maximum acceptable CV percentage set by the laboratory. When the current CV exceeds this threshold, it signals that assay precision has fallen below acceptable standards and may require investigation.',
    relatedTermIds: ['cv', 'cv-trend', 'warning'],
  },
  {
    id: 'lot-number',
    term: 'Lot No. (Lot Number)',
    aliases: ['lot number', 'lot no', 'reagent lot', 'batch number'],
    categoryId: 'lot-management',
    definition:
      'A unique identifier assigned by the reagent manufacturer to a specific batch of control material. Since reagent characteristics can vary between lots, QC data for Positive and Negative controls is tracked separately per lot to ensure meaningful comparisons.',
    relatedTermIds: ['lot-expiry', 'positive-control', 'negative-control', 'protocol-number'],
  },
  {
    id: 'lot-expiry',
    term: 'Lot Expiry',
    aliases: ['expiry date', 'expiration date', 'lot expiration'],
    categoryId: 'lot-management',
    definition:
      'The date beyond which a reagent lot is no longer certified for use. QC Pulse flags approaching expiry dates to ensure timely lot transitions and prevent data gaps in monitoring continuity.',
    relatedTermIds: ['lot-number', 'positive-control', 'negative-control'],
  },
];

export function getGlossaryCategory(categoryId: GlossaryCategoryId): GlossaryCategory {
  const category = GLOSSARY_CATEGORIES.find((item) => item.id === categoryId);

  if (category === undefined) {
    throw new Error(`Unknown glossary category: ${categoryId}`);
  }

  return category;
}
