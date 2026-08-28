/**
 * Shared chart tokens.
 *
 * The Levey-Jennings chart's palette is fixed by AGENTS.md as an institutional
 * convention — brand blue for the OD line, amber for ±2 SD, red for the ±3 SD
 * action limit. The charts added alongside it draw from the same vocabulary so a
 * supervisor reads red as "action limit" everywhere rather than relearning it per
 * panel.
 *
 * The two-series pair below was checked with the dataviz palette validator rather
 * than picked by eye: blue against teal separates at ΔE 27.2 under protanopia and
 * 13.1 under tritanopia, both clear of the 8-point floor. Blue against violet, the
 * obvious first choice, fails at 3.3.
 */
export const CHART_SERIES = {
  /** Identity hue for the primary measure. */
  primary: '#1a1aff',
  /** Second categorical hue. Validated against `primary` for colour-blind safety. */
  secondary: '#0d9488',
} as const;

/**
 * Status colours, reserved for state and never reused as a series hue.
 * Matches the AGENTS.md status palette.
 */
export const CHART_INK = {
  primary: '#111827',
  secondary: '#374151',
  muted: '#6b7280',
  /** Watchlist. Also the ±2 SD convention on the Levey-Jennings chart. */
  warning: '#d97706',
  /** Out of control. Also the ±3 SD clinical action limit. */
  critical: '#dc2626',
  good: '#16a34a',
} as const;

export const CHART_SURFACE = {
  light: '#ffffff',
  grid: '#eef2f7',
  muted: '#f8fafc',
} as const;

/**
 * Reference-line styling for the SD bands, matching the Levey-Jennings chart in
 * `chart-config.ts` exactly. Any panel that draws SD boundaries reads from here,
 * so a supervisor sees the same amber ±2 and red ±3 in every chart.
 *
 * The dataviz validator flags amber at 2.09:1 against white. That is a real
 * contrast warning and is not dismissable: every chart using these bands must
 * label the lines directly or ship the numbers alongside, never leave the colour
 * to carry the meaning on its own.
 */
export const SD_BAND = {
  mean: { color: '#8A8F98', width: 1.5, dash: [] as number[] },
  oneSD: { color: '#B8BDC5', width: 1.25, dash: [6, 6] },
  twoSD: { color: '#F59E0B', width: 1.25, dash: [4, 5] },
  threeSD: { color: '#EF4444', width: 1.5, dash: [] as number[] },
} as const;

export const CHART_FONT = 'Manrope, system-ui, sans-serif';

/** Human-readable labels for the corrective-action root causes. */
export const ROOT_CAUSE_LABELS: Record<string, string> = {
  reagent_issue: 'Reagent issue',
  instrument_malfunction: 'Instrument malfunction',
  operator_error: 'Operator error',
  sample_issue: 'Sample issue',
  environmental_factor: 'Environmental factor',
  unexplained: 'Unexplained',
  other: 'Other',
};
