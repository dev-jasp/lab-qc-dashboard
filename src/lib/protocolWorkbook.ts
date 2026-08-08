import type { CellObject, WorkBook, WorkSheet } from 'xlsx';

import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

/**
 * Reads a ZCMC bench protocol workbook and pulls out the single control OD a
 * QC entry needs.
 *
 * The worksheet sheet contains no original data — every one of its cells is a
 * formula pointing at RAW DATA or TEST PROTOCOL. So it is used as an *index*
 * (find the row labelled IHC, find the cell labelled "Lot No.") and each fact
 * is then read from the cell the formula points at. Cached formula results are
 * a last resort, because a workbook saved without recalculating carries the
 * previous run's numbers in them.
 *
 * The rendered worksheet strings are never trusted: "Protocol no.: X" and
 * "Lot No.:X" disagree on their own separator two cells apart, and the date is
 * wrapped in TEXT(..., "mm/dd/yyyy"), which throws away the only thing that
 * distinguishes 08/03 from 03/08.
 */

export type ParsedRun = {
  disease: DiseaseSlug;
  controlType: ControlTypeSlug;
  /** The label matched in the LAB ID column, e.g. "IHC". */
  controlLabel: string;
  odValue: number;
  /** Well number from the worksheet table, for the provenance strip. */
  wellNumber: number | null;
  protocolNumber: string;
  lotNumber: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** ISO yyyy-mm-dd, or null when the workbook records no expiry. */
  expiryDate: string | null;
  /** Bench spelling as written on the sheet, e.g. "A.REYES". */
  performedBy: string | null;
  validatedBy: string | null;
  /**
   * True when the OD came from a cached formula result because its source cell
   * could not be resolved. Surfaced to the operator rather than hidden.
   */
  odFromCachedValue: boolean;
};

export type ParseResult =
  | { ok: true; run: ParsedRun }
  | { ok: false; error: string };

/** Only these three have a worksheet layout this parser has been proven against. */
const SUPPORTED_DISEASES: readonly DiseaseSlug[] = ['measles', 'rubella', 'rotavirus'];

/**
 * Disease is read from the worksheet's test name, never from an identifier
 * prefix: measles and rubella share the "MR" specimen prefix because they share
 * an assay, so no prefix can separate them.
 */
const TEST_NAME_PATTERNS: readonly { pattern: RegExp; disease: DiseaseSlug }[] = [
  { pattern: /measles/i, disease: 'measles' },
  { pattern: /rubella/i, disease: 'rubella' },
  { pattern: /rota/i, disease: 'rotavirus' },
  { pattern: /dengue/i, disease: 'dengue' },
  { pattern: /japanese|encephalitis/i, disease: 'japanese-encephalitis' },
];

const CONTROL_LABELS: Record<ControlTypeSlug, string> = {
  'positive-control': 'PC',
  'negative-control': 'NC',
  'in-house-control': 'IHC',
};

const DISEASE_NAMES: Record<DiseaseSlug, string> = {
  measles: 'Measles',
  rubella: 'Rubella',
  rotavirus: 'Rotavirus',
  dengue: 'Dengue',
  'japanese-encephalitis': 'Japanese encephalitis',
};

type SheetUtils = {
  decode_range: (range: string) => { s: { c: number; r: number }; e: { c: number; r: number } };
  encode_cell: (address: { c: number; r: number }) => string;
};

type CellHit = { column: number; row: number; cell: CellObject };

/**
 * Parses a protocol workbook for one control stream.
 *
 * SheetJS is loaded on demand, matching the export path — it is a large
 * dependency and most sessions never open a workbook.
 */
export async function parseProtocolWorkbook(
  data: ArrayBuffer | Uint8Array,
  controlType: ControlTypeSlug,
): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  let workbook: WorkBook;

  try {
    workbook = XLSX.read(data, { type: 'array', cellFormula: true });
  } catch {
    return fail('That file could not be read as an Excel workbook.');
  }

  return parseWorkbook(XLSX.utils, workbook, controlType);
}

/** Split out from the loader so the parsing itself is synchronous and testable. */
export function parseWorkbook(
  utils: SheetUtils,
  workbook: WorkBook,
  controlType: ControlTypeSlug,
): ParseResult {
  const worksheetName = workbook.SheetNames.find((name) => /worksheet/i.test(name));

  if (worksheetName === undefined) {
    return fail(
      'No worksheet sheet in this workbook. Expected a sheet named like "ME WORKSHEET".',
    );
  }

  const worksheet = workbook.Sheets[worksheetName];

  const diseaseResult = readDisease(utils, worksheet);

  if (!diseaseResult.ok) {
    return diseaseResult;
  }

  const disease = diseaseResult.value;
  const odTable = locateODTable(utils, worksheet);

  if (!odTable.ok) {
    return odTable;
  }

  const controlLabel = CONTROL_LABELS[controlType];
  const rows = findControlRows(utils, worksheet, odTable.value, controlLabel);

  if (rows.length === 0) {
    return fail(
      `No ${controlLabel} row in this worksheet. This run was recorded without a ${controlLabel}.`,
    );
  }

  if (rows.length > 1) {
    return fail(
      `Found ${rows.length} ${controlLabel} rows in this worksheet. Only one control row per run is supported.`,
    );
  }

  const odCellRow = rows[0];
  const odCell = cellAt(utils, worksheet, odTable.value.odColumn, odCellRow);
  const od = resolveNumber(workbook, odCell);

  if (od === null) {
    return fail(
      `The ${controlLabel} row has no numeric OD. The workbook may need to be opened and saved in Excel first.`,
    );
  }

  const protocolNumber = resolveLabelledText(utils, workbook, worksheet, /protocol\s*no/i);
  const lotNumber = resolveLabelledText(utils, workbook, worksheet, /lot\s*no/i);

  if (protocolNumber === null) {
    return fail('No protocol number found in this worksheet.');
  }

  if (lotNumber === null) {
    return fail('No lot number found in this worksheet.');
  }

  const dateResult = resolveLabelledDate(utils, workbook, worksheet, /date\s*performed/i);

  if (!dateResult.ok) {
    return dateResult;
  }

  const expiryResult = resolveLabelledDate(utils, workbook, worksheet, /expiry\s*date/i);

  return {
    ok: true,
    run: {
      disease,
      controlType,
      controlLabel,
      odValue: od.value,
      wellNumber:
        odTable.value.wellColumn === null
          ? null
          : toNumber(
              resolveLeaf(
                workbook,
                cellAt(utils, worksheet, odTable.value.wellColumn, odCellRow),
              )?.value,
            ),
      protocolNumber,
      lotNumber,
      date: dateResult.value,
      expiryDate: expiryResult.ok ? expiryResult.value : null,
      performedBy: resolveLabelledText(utils, workbook, worksheet, /performed\s*by/i),
      validatedBy: resolveLabelledText(utils, workbook, worksheet, /validated\s*by/i),
      odFromCachedValue: od.fromCachedValue,
    },
  };
}

/** True for a disease this parser's layout assumptions have been checked against. */
export function isSupportedDisease(disease: DiseaseSlug): boolean {
  return SUPPORTED_DISEASES.includes(disease);
}

export function getDiseaseName(disease: DiseaseSlug): string {
  return DISEASE_NAMES[disease];
}

function readDisease(
  utils: SheetUtils,
  worksheet: WorkSheet,
): { ok: true; value: DiseaseSlug } | { ok: false; error: string } {
  const hit = findCell(utils, worksheet, (text) => /name\s*of\s*test/i.test(text));

  if (hit === null) {
    return fail('No "Name of Test" line in this worksheet, so the disease cannot be identified.');
  }

  const testName = cellText(hit.cell);
  const matches = TEST_NAME_PATTERNS.filter((candidate) => candidate.pattern.test(testName));

  if (matches.length !== 1) {
    return fail(`Could not tell which disease "${testName.trim()}" refers to.`);
  }

  const disease = matches[0].disease;

  if (!isSupportedDisease(disease)) {
    return fail(
      `${DISEASE_NAMES[disease]} worksheets are not supported yet — their layout differs from the measles, rubella and rotavirus sheets.`,
    );
  }

  return { ok: true, value: disease };
}

type ODTable = { headerRow: number; labelColumn: number; odColumn: number; wellColumn: number | null };

/**
 * Locates the run table by its header rather than a fixed row, because a run
 * recorded without an IHC shifts every row beneath it.
 */
function locateODTable(
  utils: SheetUtils,
  worksheet: WorkSheet,
): { ok: true; value: ODTable } | { ok: false; error: string } {
  const labelHeader = findCell(utils, worksheet, (text) => text.trim().toUpperCase() === 'LAB ID');

  if (labelHeader === null) {
    return fail('No "LAB ID" column header in this worksheet.');
  }

  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');
  let odColumn: number | null = null;
  let wellColumn: number | null = null;

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const heading = cellText(cellAt(utils, worksheet, column, labelHeader.row)).trim().toUpperCase();

    if (heading === 'OD') {
      odColumn = column;
    }

    if (heading.startsWith('WELL')) {
      wellColumn = column;
    }
  }

  if (odColumn === null) {
    return fail('No "OD" column header in this worksheet.');
  }

  return {
    ok: true,
    value: { headerRow: labelHeader.row, labelColumn: labelHeader.column, odColumn, wellColumn },
  };
}

function findControlRows(
  utils: SheetUtils,
  worksheet: WorkSheet,
  table: ODTable,
  controlLabel: string,
): number[] {
  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');
  const rows: number[] = [];

  for (let row = table.headerRow + 1; row <= range.e.r; row += 1) {
    const label = cellText(cellAt(utils, worksheet, table.labelColumn, row)).trim().toUpperCase();

    if (label === controlLabel) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Reads a fact the worksheet labels, following the label's formula back to the
 * cell that actually holds it.
 *
 * Two shapes occur. Some cells fuse label and value into one string
 * ("Protocol no.: " & 'RAW DATA'!A1); others put the label in one cell and the
 * value in another further along the row ("Performed by: " ... 'RAW DATA'!B15).
 * Both resolve to a source cell, so both are handled the same way.
 */
function resolveLabelledCell(
  utils: SheetUtils,
  workbook: WorkBook,
  worksheet: WorkSheet,
  label: RegExp,
): { value: unknown; fromCachedValue: boolean } | null {
  const hit = findCell(utils, worksheet, (text) => label.test(text));

  if (hit === null) {
    return null;
  }

  if (typeof hit.cell.f === 'string') {
    const direct = resolveLeaf(workbook, hit.cell);

    if (direct !== null) {
      return direct;
    }
  } else {
    // A literal cell either fuses the value onto the label ("Lot No.: X") or
    // is a bare caption whose value sits further along the row. Resolving the
    // cell itself would hand back the caption, so the text is split instead.
    const inlineValue = textAfterLabel(cellText(hit.cell));

    if (inlineValue !== null) {
      return { value: inlineValue, fromCachedValue: false };
    }
  }

  // Bare caption: the value sits somewhere to its right on the same row.
  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');

  for (let column = hit.column + 1; column <= range.e.c; column += 1) {
    const neighbour = cellAt(utils, worksheet, column, hit.row);
    const resolved = resolveLeaf(workbook, neighbour);

    if (resolved !== null) {
      return resolved;
    }
  }

  return null;
}

function textAfterLabel(text: string): string | null {
  const separator = text.indexOf(':');

  if (separator === -1) {
    return null;
  }

  const remainder = text.slice(separator + 1).trim();
  return remainder === '' ? null : remainder;
}

function resolveLabelledText(
  utils: SheetUtils,
  workbook: WorkBook,
  worksheet: WorkSheet,
  label: RegExp,
): string | null {
  const resolved = resolveLabelledCell(utils, workbook, worksheet, label);

  if (resolved === null) {
    return null;
  }

  const text = String(resolved.value ?? '').trim();
  return text === '' ? null : text;
}

function resolveLabelledDate(
  utils: SheetUtils,
  workbook: WorkBook,
  worksheet: WorkSheet,
  label: RegExp,
): { ok: true; value: string } | { ok: false; error: string } {
  const resolved = resolveLabelledCell(utils, workbook, worksheet, label);

  if (resolved === null) {
    return fail('No date found in this worksheet.');
  }

  const serial = toNumber(resolved.value);

  if (serial !== null) {
    return { ok: true, value: excelSerialToIsoDate(serial) };
  }

  const text = String(resolved.value ?? '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { ok: true, value: text };
  }

  return fail(
    `The date reads "${text}", which is stored as text rather than a date. There is no way to tell a day from a month in it.`,
  );
}

/**
 * Follows a formula to the cell it references and returns that cell's value.
 *
 * A formula that is not a plain single-cell reference — a rounding call, an
 * IF() guard — has nowhere to navigate to, so its cached result is used and
 * flagged, which is better than rejecting a workbook over a cosmetic change.
 */
function resolveLeaf(
  workbook: WorkBook,
  cell: CellObject | undefined,
): { value: unknown; fromCachedValue: boolean } | null {
  if (cell === undefined) {
    return null;
  }

  const formula = typeof cell.f === 'string' ? cell.f : null;

  if (formula !== null) {
    const reference = findSheetReference(formula);

    if (reference !== null) {
      const sourceSheet = workbook.Sheets[reference.sheet];
      const sourceCell = sourceSheet === undefined ? undefined : sourceSheet[reference.address];

      if (sourceCell !== undefined && isCellObject(sourceCell) && sourceCell.v !== undefined) {
        return { value: sourceCell.v, fromCachedValue: false };
      }
    }
  }

  if (cell.v === undefined || cell.v === '') {
    return null;
  }

  return { value: cell.v, fromCachedValue: formula !== null };
}

function resolveNumber(
  workbook: WorkBook,
  cell: CellObject | undefined,
): { value: number; fromCachedValue: boolean } | null {
  const resolved = resolveLeaf(workbook, cell);

  if (resolved === null) {
    return null;
  }

  const value = toNumber(resolved.value);

  return value === null ? null : { value, fromCachedValue: resolved.fromCachedValue };
}

/** Pulls the first sheet-qualified reference out of a formula. */
function findSheetReference(formula: string): { sheet: string; address: string } | null {
  const quoted = /'([^']+)'!(\$?[A-Z]+\$?\d+)/.exec(formula);

  if (quoted !== null) {
    return { sheet: quoted[1], address: quoted[2].replace(/\$/g, '') };
  }

  const bare = /(?:^|[^A-Za-z0-9_'])([A-Za-z0-9_]+)!(\$?[A-Z]+\$?\d+)/.exec(formula);

  if (bare !== null) {
    return { sheet: bare[1], address: bare[2].replace(/\$/g, '') };
  }

  return null;
}

function findCell(
  utils: SheetUtils,
  worksheet: WorkSheet,
  matches: (text: string) => boolean,
): CellHit | null {
  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = cellAt(utils, worksheet, column, row);

      if (cell === undefined) {
        continue;
      }

      const text = cellText(cell);

      if (text !== '' && matches(text)) {
        return { column, row, cell };
      }
    }
  }

  return null;
}

function cellAt(
  utils: SheetUtils,
  worksheet: WorkSheet,
  column: number,
  row: number,
): CellObject | undefined {
  const cell: unknown = worksheet[utils.encode_cell({ c: column, r: row })];
  return isCellObject(cell) ? cell : undefined;
}

function cellText(cell: CellObject | undefined): string {
  if (cell === undefined || cell.v === undefined || cell.v === null) {
    return '';
  }

  return String(cell.v);
}

function isCellObject(value: unknown): value is CellObject {
  return typeof value === 'object' && value !== null && 't' in value;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Excel's day zero is 1899-12-30, which also absorbs the fictional 1900 leap
 * day that its serials are offset by.
 */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function excelSerialToIsoDate(serial: number): string {
  return new Date(EXCEL_EPOCH_UTC + Math.round(serial) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
