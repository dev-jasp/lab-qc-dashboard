# AGENTS.md - QC Pulse

This file is the source of truth for agentic coding sessions on this project.
Read it fully before touching any code.

---

## Project Overview

**QC Pulse** is a web-based clinical laboratory QC monitor for the
**Vaccine Preventable Disease Referral Laboratory (VPDRL)**
at **Zamboanga City Medical Center (ZCMC)**.

It performs Levey-Jennings analysis on Optical Density (OD) runs, surfaces
Westgard-style QC status, and is organized into disease-specific monitor flows
for surveillance work.

The current product direction is:

- `/monitor` is the disease selector landing page.
- `/monitor/:disease` is a disease overview showing all 3 controls at a glance.
- `/monitor/:disease/:control` is the full control monitor with chart, run
  statistics, record form, and rule/status panels.
- `/violations` is the global violation inbox across all diseases and controls.
- `/analytics` is the cross-stream QC performance overview (root-cause Pareto,
  rule activity). Per-stream drift and precision charts live on the control
  monitor, not here.
- `/history` is intended as the historical data browser, filtering by flag, date,
  and lot. It is currently a stub — see Current UI State.
- `/settings` is the tabbed configuration page.

Primary users are laboratory technicians and supervisors at desktop workstations,
with a secondary mobile view for quick checks.

---

## Tech Stack

| Tool                | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| React + TypeScript  | UI framework and type safety                       |
| Vite                | Dev server and bundler                             |
| React Router v6     | Client-side routing                                |
| Redux Toolkit       | Store, slices, and typed thunks                    |
| RTK Query           | Cache over `qcStorage` with tag-based invalidation |
| Tailwind CSS        | Utility-first styling                              |
| shadcn/ui           | Accessible UI primitives (see component map below) |
| Chart.js            | Levey-Jennings chart, sparklines, bar charts       |
| Phosphor Icons      | UI icons (`@phosphor-icons/react`) — not Lucide     |
| SheetJS (xlsx)      | Client-side Excel export                           |
| jsPDF + html2canvas | PDF report generation, A4 landscape                |
| Framer Motion       | Panel and page reveal animations                   |

### shadcn/ui Component Map

Use these specific shadcn components for these UI patterns. Do not reach for
custom implementations when a shadcn primitive covers the use case.

| shadcn Component         | Used For                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `Dialog` / `AlertDialog` | "Start new lot" modal, delete confirmation, pre-export modal    |
| `Sheet`                  | Lot archive browser, compare lots panel (slide-over from right) |
| `Tabs`                   | Settings page sections, Violation Inbox (Open / All)            |
| `Select`                 | Lot selector dropdown, flag type, disease filter, rule filter   |
| `Table`                  | Recent logs, violation history, audit trail, lot archive list   |
| `Badge`                  | Lot status, Westgard rule status, expiry status, severity       |
| `Toast` (Sonner)         | Success/error feedback on form submissions and saves            |
| `Calendar` / `Popover`   | Date fields in data entry and batch entry rows                  |
| `Accordion`              | Inline corrective action form expanding below a violation row   |
| `Progress`               | Run count progress toward minimum Westgard activation threshold |

Do **not** use shadcn for: Chart.js charts, Canvas sparklines, the OD input
form, or batch entry dynamic rows.

---

## Current Structure

```text
lab-qc-dashboard/
|- public/
|- src/
|  |- components/
|  |  |- auth/          <- ProtectedRoute
|  |  |- chart/         <- LeveyJennings, CUSUM, RollingCV, ViolationPareto
|  |  |- dashboard/     <- QCDashboard.tsx, the whole control monitor
|  |  |- export/        <- export modal, report dialog, A4 printable layout
|  |  |- help/          <- glossary search and term list
|  |  |- layout/        <- AppShell, AppSidebar, DashboardHeader, Footer
|  |  |- lots/          <- lot table, lot form dialog, attention panel
|  |  |- panels/        <- QC rules, statistics, edit sheet, run file dropzone
|  |  |- personnel/     <- staff table, form dialog, picker, avatar
|  |  |- ui/            <- shadcn primitives, lowercase filenames
|  |- constants/
|  |  |- monitor-config.ts   <- disease/control metadata and seeded data
|  |  |- qc-rules.ts
|  |  |- glossary.ts
|  |  |- landing-images.ts
|  |- hooks/
|  |  |- useAuth.ts, useQCLogic.ts, useToast.ts
|  |  |- use-mobile.ts, useRouteScrollRestoration.ts
|  |- lib/                   <- pure logic, no React imports
|  |  |- qcStorage.ts        <- single module for all localStorage access
|  |  |- qcMonitor.ts        <- seeding, control params, chart adapters
|  |  |- auth.ts             <- PIN hashing and session
|  |  |- diseaseOverview.ts  <- all-controls summary derivation
|  |  |- lotRegistry.ts, lotValidation.ts
|  |  |- staffDirectory.ts, staffSeed.ts
|  |  |- protocolWorkbook.ts <- bench protocol workbook import
|  |  |- reportPeriod.ts
|  |  |- exportQCChart.ts    <- html2canvas capture + jsPDF A4
|  |  |- exportXlsx.ts, exportCsv.ts
|  |  |- exportCatalog.ts, exportRows.ts, exportSections.ts, exportFilenames.ts
|  |  |- downloadFile.ts
|  |- store/
|  |  |- index.ts            <- configureStore, RootState, AppDispatch
|  |  |- hooks.ts            <- typed useAppDispatch / useAppSelector
|  |  |- api/
|  |  |  |- qcApi.ts         <- createApi, tag ids, queryFn adapters
|  |  |  |- entriesEndpoints.ts, lotsEndpoints.ts, violationsEndpoints.ts
|  |  |  |- overviewEndpoints.ts, settingsEndpoints.ts
|  |  |- slices/             <- auth session, violation and report filters
|  |  |- selectors/          <- memoized derivations shared across components
|  |- pages/
|  |  |- LoginPage.tsx
|  |  |- DiseaseSelector.tsx, DiseaseOverview.tsx, ControlMonitor.tsx
|  |  |- Violations.tsx, Analytics.tsx, History.tsx
|  |  |- Lots.tsx, Personnel.tsx, StaffProfile.tsx
|  |  |- Reports.tsx, Settings.tsx, Help.tsx
|  |- types/
|  |  |- qc.types.ts, export.ts
|  |- utils/
|  |  |- qc-calculations.ts  <- Westgard, statistics, rolling CV, CUSUM
|  |  |- chart-theme.ts      <- shared chart tokens
|  |  |- chart-config.ts, export.ts, cn.ts
|  |- styles/
|  |  |- print.css
|  |- App.tsx
|  |- main.tsx
|  |- router.tsx
|  |- index.css
|- AGENTS.md
|- PRD.md
|- package.json
|- tsconfig.app.json
|- tsconfig.node.json
|- vite.config.ts
```

Notes:

- The chart folder is `src/components/chart/`, not `charts/`.
- Disease/control metadata and seeded data live in `src/constants/monitor-config.ts`.
- The full monitor experience is powered by `QCDashboard.tsx`, reused by route-level pages.
- **Never access localStorage directly in components.** All reads and writes must
  go through `src/lib/qcStorage.ts`.
- `src/lib/` and `src/utils/qc-calculations.ts` are pure, framework-agnostic
  modules. Keep them free of React imports.
- Tests live beside the module they cover as `*.test.ts`. Run them with `npm test`.

---

## Routing Structure

```text
/                                -> redirect to /monitor
/login                           -> LoginPage.tsx        (public)
/dashboard                       -> redirect to /monitor (guarded)

Everything below is wrapped in <ProtectedRoute> and rendered inside <AppShell>:

/monitor                         -> DiseaseSelector.tsx
/monitor/:disease                -> DiseaseOverview.tsx
/monitor/:disease/:control       -> ControlMonitor.tsx
/violations                      -> Violations.tsx
/analytics                       -> Analytics.tsx
/history                         -> History.tsx          (stub — see Current UI State)
/lots                            -> Lots.tsx
/personnel                       -> Personnel.tsx
/personnel/:staffId              -> StaffProfile.tsx
/reports                         -> Reports.tsx
/exports                         -> redirect to /reports (legacy path)
/help                            -> Help.tsx
/settings                        -> Settings.tsx
*                                -> redirect to /monitor
```

Router implementation details:

- Uses React Router v6 with `createBrowserRouter` and `<RouterProvider>`.
- Route definitions live in `src/router.tsx`.
- `src/main.tsx` wraps the app in the Redux `<Provider>`; `src/App.tsx` renders
  `<RouterProvider>` alongside the toaster and image preloader.
- `/exports` is kept as a redirect so older links still resolve. Do not remove it.

Allowed `:disease` params:

- `measles`
- `rubella`
- `rotavirus`
- `japanese-encephalitis`
- `dengue`

Allowed `:control` params. These are **URL** slugs (`ControlTabSlug`) and are not
the storage slugs:

- `in-house`
- `positive`
- `negative`

The domain and storage vocabulary (`ControlTypeSlug`) is `in-house-control`,
`positive-control`, `negative-control` — that is what the `qc_*` localStorage
keys use. `src/constants/monitor-config.ts` maps between the two. Navigating to
`/monitor/measles/in-house-control` does **not** resolve; it falls through the
catch-all and redirects to `/monitor`.

---

## Domain Knowledge

This is a clinical laboratory QC application. Domain correctness matters more
than cosmetic speed.

### Key Concepts

- **OD (Optical Density / Absorbance)**: numeric run value stored as `number`,
  displayed to 4 decimal places.
- **Mean and SD**: baseline central tendency and spread used for QC interpretation.
- **Levey-Jennings Chart**: sequential OD chart with mean and SD reference lines.
- **Westgard Rules**: QC interpretation rules used to identify warning and reject
  conditions.
- **Control Types**: each disease has 3 control streams:
  - In-house Control — lab-made, continuous, never resets regardless of reagent unless the supervisor decided to create a new batch of in-house controls
    lot changes. One single dataset per disease/control pair, ever-growing.
  - Positive Control — from commercial reagent kit. Scoped per reagent lot number.
    A new lot starts a completely new dataset. Old lots are archived (read-only).
  - Negative Control — same lot-scoped behavior as Positive Control.
- **Lot Number**: reagent lot identifier (e.g., `E240423AS`). Critical for
  Positive/Negative control data isolation. In-house Control has no lot separation.
- **Protocol No.**: user-entered run label used as the chart x-axis and in logs.
- **Technician ID**: required audit metadata at the domain level. Current UI gap
  is temporary — do not treat its absence as a permanent design decision.
- **Percent CV**: `(SD / Mean) × 100`. Displayed to 2 decimal places with `%`.
- **Rolling CV**: CV calculated over sequential windows of 10 runs for trend
  detection. "Rising" if CV increases > 1% over 3 consecutive windows.
  "High CV" if current CV exceeds the configured threshold (default 15%).

### Statistics Engine

Always calculate from the full active dataset (all entries for In-house;
lot-filtered entries for Positive/Negative):

```ts
mean = sum(odValues) / n;
sd = sqrt(sum((x - mean) ^ 2) / (n - 1)); // sample SD, not population SD
cv = (sd / mean) * 100;
sdLines = {
  plus3: mean + 3 * sd,
  plus2: mean + 2 * sd,
  plus1: mean + 1 * sd,
  minus1: mean - 1 * sd,
  minus2: mean - 2 * sd,
  minus3: mean - 3 * sd,
};
```

Minimum 2 data points required to calculate SD.
Minimum 10 data points before Westgard rules activate (configurable in Settings).

### Westgard Rules Reference

| Rule   | Trigger Condition                                               | Severity  |
| ------ | --------------------------------------------------------------- | --------- |
| `1_2s` | 1 point exceeds ±2 SD                                           | Warning   |
| `1_3s` | 1 point exceeds ±3 SD                                           | Rejection |
| `2_2s` | 2 consecutive points exceed the same ±2 SD side                 | Rejection |
| `R_4s` | Range between any 2 consecutive points exceeds 4 SD             | Rejection |
| `4_1s` | 4 consecutive points all exceed the same ±1 SD side             | Rejection |
| `10x`  | 10 consecutive points all on the same side of the mean          | Warning   |
| `7T`   | 7 consecutive points strictly increasing OR strictly decreasing | Warning   |

Rules evaluate against the full sorted `odValues[]` array on every submission.
Return per rule:

```ts
{
  ruleName: string
  passed: boolean
  status: 'passed' | 'violated' | 'insufficient_data'
  triggeringIndices: number[]
}
```

Rejection rules display red. Warning rules (`1_2s`, `10x`, `7T`) display amber.
Do not silently change rule logic — see Critical Rules below.

---

## Data Model

All data is persisted in `localStorage`. All access goes through
`src/lib/qcStorage.ts` — never read or write `localStorage` directly in
components or hooks.

### localStorage Key Conventions

```text
qc_{disease}_{controlType}
  → Entry array for In-house Control (continuous, no lot suffix)
  → Example: qc_measles_in-house-control

qc_{disease}_{controlType}_{lotNumber}
  → Entry array for Positive or Negative Control, scoped per lot
  → Example: qc_measles_positive-control_E240423AS

qc_lots_{disease}_{controlType}
  → Array of lot metadata objects for Positive/Negative controls
  → Example: qc_lots_measles_positive-control

qc_violations_{disease}_{controlType}_{lotOrInhouse}
  → Violation log entries for a specific control stream
  → Example: qc_violations_measles_in-house-control

qc_audit_{disease}_{controlType}_{lotOrInhouse}
  → Edit/delete audit trail entries (append-only, never mutate)

qc_settings
  → Single object with all app-wide settings

qc_users
  → Array of user account objects

qc_logo_seal
  → Base64 string of ZCMC seal image (set via Settings > Export)

qc_logo_pathology
  → Base64 string of ZCMC Pathology logo (set via Settings > Export)
```

Session (not persisted across tab close):

```text
sessionStorage: qc_session
  → Current logged-in user session object
```

### Entry Object

```ts
type QCEntry = {
  id: string; // crypto.randomUUID()
  date: string; // ISO date YYYY-MM-DD
  protocolNumber: string; // e.g. "MEA-IH-001"
  odValue: number; // 4 decimal places, never a string
  lotNumber: string;
  controlCode: string;
  runNumber: string;
  vialNumber: string;
  flag: QCEntryFlag | null;
  notes: string | null; // max 200 chars
  editedAt: string | null; // ISO timestamp of last edit
  editReason: string | null;
  signedBy: string | null;
  signedAt: string | null; // ISO timestamp
};

type QCEntryFlag =
  | "reagent_reconstituted"
  | "new_operator"
  | "equipment_maintenance"
  | "repeat_test"
  | "reagent_thawed"
  | "instrument_calibrated"
  | "anomalous_result"
  | "corrective_repeat"
  | "other";
```

### Lot Metadata Object

```ts
type LotMetadata = {
  lotNumber: string;
  startDate: string; // ISO date
  endDate: string | null; // null = currently active
  expiryDate: string | null;
  status: "active" | "archived";
  notes: string | null;
};
```

### Violation Log Entry

```ts
type ViolationEntry = {
  id: string;
  timestamp: string; // ISO datetime
  ruleName: WestgardRule;
  severity: "rejection" | "warning";
  triggeringProtocols: string[];
  triggeringODValues: number[];
  lotNumber: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  correctiveAction: CorrectiveAction | null;
};

type CorrectiveAction = {
  rootCause: CorrectiveRootCause;
  rootCauseDetails: string | null;
  actionTaken: string; // required
  preventiveAction: string | null;
  repeatTestPerformed: boolean;
  repeatODValue: number | null;
  repeatProtocolNumber: string | null;
  outcome: "resolved" | "ongoing" | "escalated";
  acknowledgedBy: string;
  acknowledgedAt: string;
};

type CorrectiveRootCause =
  | "reagent_issue"
  | "instrument_malfunction"
  | "operator_error"
  | "sample_issue"
  | "environmental_factor"
  | "unexplained"
  | "other";
```

### Audit Trail Entry

```ts
type AuditEntry = {
  id: string;
  timestamp: string; // ISO datetime
  action: "EDIT" | "DELETE";
  performedBy: string;
  originalValues: QCEntry; // snapshot before change
  newValues: QCEntry | null; // null for DELETE
  reason: string; // required
};
```

Audit records are **append-only**. Never mutate or delete audit entries.

---

## Export Format — ZCMC Official Document

All exports (PNG, Excel, PDF) must include this institutional header:

```
Line 1 (bold, centered): ZAMBOANGA CITY MEDICAL CENTER
Line 2: Department of Pathology and Laboratory Medicine
Line 3: Dr. D. Evangelista St. Sta. Catalina, 7000 Zamboanga City
Line 4: Vaccine Preventable Disease Referral Laboratory (VPDRL)
Line 5: EIA QUALITY CONTROL GRAPH
Left logo:  ZCMC seal        (base64 from localStorage: qc_logo_seal)
Right logo: ZCMC Pathology   (base64 from localStorage: qc_logo_pathology)
```

Excel export column order:

```
Date of experiment | Control code / Run number / Vial number |
Protocol number | OD | OD/COV (if applicable) | Lot Number | Remarks
```

Excel statistics block (rendered above data table):

```
Left side:  SUM, Mean, SD, CV%
Right side: Mean+1SD, Mean-1SD, Mean+2SD, Mean-2SD, Mean+3SD, Mean-3SD
```

File naming conventions:

```
PNG:   {Disease}-{ControlType}-{LotNumber}-QC-Chart-{YYYY-MM-DD}.png
Excel: {Disease}-{ControlType}-{LotNumber}-QC-Data-{YYYY-MM-DD}.xlsx
PDF:   {Disease}-QC-Report-{Period}-{YYYY}.pdf
```

Export implementations live in:

- `src/lib/exportQCChart.ts` — html2canvas capture + jsPDF, A4 single and multi-page
- `src/lib/exportXlsx.ts` — SheetJS `XLSX.utils.aoa_to_sheet()`
- `src/lib/exportCsv.ts` — raw run data, per stream and per disease
- `src/lib/exportCatalog.ts`, `exportRows.ts`, `exportSections.ts`,
  `exportFilenames.ts` — shared shaping, the ZCMC header rows, and file naming

---

## User Roles & Auth

Auth is client-side only (no backend). PINs are hashed with `crypto.subtle`
SHA-256 and stored in localStorage.

| Role           | Capabilities                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analyst**    | View all data, submit new entries, add remarks/flags, download reports                                                                                |
| **Supervisor** | All Analyst actions + edit entries (with audit), delete entries (with audit), acknowledge violations, sign off run sets, start new lots, archive lots |
| **Admin**      | All Supervisor actions + manage users, configure disease/control settings, manage QC thresholds, backup/restore data                                  |

Session stored in `sessionStorage` as `qc_session`. Inactivity auto-logout
after 30 minutes (configurable). Session clears on tab close.

Supervisor sign-off locks entries from further edit/delete until the sign-off
is explicitly reversed.

Hide (do not just disable) controls the current role cannot use.

---

## Brand & Design Tokens

```
Primary blue:     #1a1aff
Font:             Manrope (primary UI and chart font)

Status colors:
  In Control:     green  — bg #dcfce7 / text #16a34a
  Watchlist:      amber  — bg #fef3c7 / text #d97706
  Out of Control: red    — bg #fee2e2 / text #dc2626
  Archived:       gray   — bg #f3f4f6 / text #6b7280

OD values:        always 4 decimal places
Statistics:       always 3 decimal places
CV:               always 2 decimal places with % suffix
```

Chart colors (Chart.js):

```
Primary OD line:  #1a1aff
Mean line:        #888888  (solid)
+2SD / -2SD:      #f59e0b  (dashed)
+3SD / -3SD:      #ef4444  (solid — clinical action limit)
Point — normal:        filled blue circle,  radius 4
Point — flagged:       hollow diamond (rectRot), radius 5
Point — edited:        filled coral circle,  radius 4
Point — violation:     filled red circle,    radius 6
```

### Charts beyond Levey-Jennings

Shared tokens live in `src/utils/chart-theme.ts`. Import from there rather than
hard-coding hexes, so every panel reads as one system.

```
Series — primary:      #1a1aff  (brand blue, the measure being plotted)
Series — secondary:    #0d9488  (teal, the second categorical hue)
```

Rules that hold for every chart in this app:

1. **Never a dual-axis chart.** Two y-scales let either series be rescaled
   independently, so where the marks cross means nothing. The root-cause Pareto
   would traditionally use one; it expresses both bars and cumulative line as
   percentages of the same total instead, sharing one axis. Raw counts go in the
   tooltip and the table, where they cannot distort the geometry.
2. **The blue/teal pair is validated, not chosen by eye.** They separate at
   ΔE 27.2 under protanopia and 13.1 under tritanopia, well clear of the 8-point
   floor. The obvious alternative, blue against violet, fails at 3.3. If you add a
   third series, run it through a CVD validator before shipping it.
3. **Status colours are reserved.** Amber is watchlist (and ±2 SD), red is out of
   control (and the ±3 SD action limit). Never reuse either as a series hue — a
   supervisor should read red as "action limit" in every panel.
4. **Colour is never the only encoding.** Two or more series get a legend; severity
   gets a text badge as well as a colour; the Pareto ships a data table.
5. **One hue per measure.** Pareto bars are all one colour because they are one
   measure across categories. Colouring bars by rank implies they are different
   series and is wrong. The OD histogram follows the same rule — one hue across
   bins, because a bin is not a series.
6. **SD reference lines come from `SD_BAND` in `chart-theme.ts`.** Do not
   re-type the hexes. The validator scores the amber ±2 SD line at 2.09:1
   against white, which is a contrast warning that cannot be waved away: any
   chart drawing these bands must label the lines directly or print the band
   numbers beside the chart, so the colour is never the only cue. Both the
   Levey-Jennings chart and the OD histogram do this.

---

## Custom Hooks

Data access is generated by RTK Query, not hand-written. Import the generated
hooks from `src/store/api/*Endpoints.ts`:

| Hook | Purpose |
| --- | --- |
| `useGetEntriesQuery`, `useAddEntryMutation`, `useUpdateEntryMutation`, `useDeleteEntryMutation` | Entries for one disease/control/lot stream |
| `useGetLotsQuery`, `useGetActiveLotQuery`, `useCreateLotMutation`, `useArchiveLotMutation` | Reagent lot metadata for positive/negative controls |
| `useGetInHouseBatchesQuery`, `useGetActiveInHouseBatchQuery`, `useCreateInHouseBatchMutation`, `useArchiveInHouseBatchMutation` | In-house control batches |
| `useGetViolationsQuery`, `useGetAllViolationsQuery`, `useAddViolationMutation`, `useAcknowledgeViolationMutation` | Violation log, per stream and across all streams |
| `useGetStaffQuery`, `useGetStaffDirectoryQuery`, `useCreateStaffMemberMutation`, `useUpdateStaffMemberMutation` | Personnel roster |
| `useGetSettingsQuery`, `useUpdateSettingsMutation` | App-wide settings |
| `useGetDiseaseOverviewQuery` | Pre-derived all-controls summary for the disease overview |
| `useGetLotRegistryQuery` | Cross-disease lot registry for the Lots page |

Hand-written hooks in `src/hooks/`:

| Hook | Purpose |
| --- | --- |
| `useAuth` | Facade over the auth slice — retain its return shape |
| `useQCLogic` | Composite chart/statistics hook used by the monitor |
| `useToast` | Toast facade over Sonner |
| `useIsMobile` | Breakpoint check for the mobile layout |
| `useRouteScrollRestoration` | Restores scroll position per route |

There is no `useWestgard` and no `useRollingCV`. Rule evaluation, statistics,
rolling CV, and CUSUM are pure functions in `src/utils/qc-calculations.ts` —
call them directly and memoize at the call site.

---

## Current UI State

Verified against the working tree on 2026-08-27. When a change makes a line here
wrong, fix it in the same change.

### Built and wired

- Login, PIN-based auth, role-gated routes via `ProtectedRoute`, session in an
  auth slice.
- Disease selector, disease overview, and the full control monitor.
- Levey-Jennings, CUSUM, rolling-CV, and OD-distribution charts on the control
  monitor; shared tokens in `src/utils/chart-theme.ts`.
- The OD distribution panel is the only one that reads the runs as a population
  rather than a sequence. It reports observed versus normal-theory occupancy of
  each SD band plus sample skewness, which is how a bimodal or skewed stream — the
  case where the SD-based Westgard limits describe a distribution the data does
  not have — becomes visible at all.
- Westgard evaluation on every submission, writing violations through the cache.
- Submission form capturing OD, protocol number, lot/batch, performer and
  validator. Performer is required, and the validator must be a different person.
- Supervisor entry edit and delete with an audit reason, via `EditEntriesSheet`
  on the control monitor.
- Bench protocol workbook import to pre-fill entries.
- Violation inbox at `/violations` — Open/All tabs plus a root-cause Pareto.
- Cross-stream analytics at `/analytics`.
- Lots page: lot and in-house batch creation, archival, cross-disease registry.
- Personnel roster and staff profiles.
- Reports page: CSV, Excel, and PDF export with the ZCMC letterhead and an A4
  print preview.
- Settings, tabbed, persisted to `qc_settings`.
- Help page with a QC glossary.
- shadcn/ui **is** installed — 25 primitives in `src/components/ui/`.
- Redux Toolkit + RTK Query is the state layer. Every dataset `qcStorage` owns
  sits behind an endpoint.

### Known gaps

These are the real holes. Do not assume a feature works because a page exists.

- **`/history` is a stub.** It renders placeholder copy only. The audit trail,
  its filters, and expandable detail rows are unbuilt, and the `qc_audit_*`
  records `qcStorage` writes have no reader anywhere in the UI. Several "Review
  history" buttons link here and currently lead to a dead end.
- **The violation loop does not close.** Violations are written and listed, but
  nothing calls `useAcknowledgeViolationMutation`, and the monitor always writes
  `correctiveAction: null`. There is no acknowledge form and no corrective-action
  form. Consequence: the root-cause Pareto on `/violations` and `/analytics` is
  charting **seeded history only** — `buildSeedViolations` synthesizes corrective
  actions that live usage cannot yet produce.
- **Sign-off can never be set.** `qcStorage` and the monitor both enforce the
  lock (a signed entry refuses edit and delete), but no UI writes `signedBy`, so
  every entry stays unsigned forever.
- Entry data is still **seeded** from `src/constants/monitor-config.ts` on first
  load rather than starting empty.
- No Daily/Weekly toggle on the Levey-Jennings chart, which PRD 6.1 asks for.
- Batch data entry is designed but not implemented.

---

## Coding Conventions

### TypeScript

- Use `type` for data shapes and `interface` for component props.
- Never use `any`. Use `unknown` and narrow when needed.
- Keep OD values as `number` throughout the data pipeline. Parse at the input
  edge; never store or pass OD as a string.
- Favor explicit unions for disease slugs, control slugs, flag types, root causes.
- Generate IDs with `crypto.randomUUID()`.
- Format dates as ISO strings (`YYYY-MM-DD` for dates, full ISO for timestamps).
  Never use `Date` object equality for comparison — compare ISO strings.

### Components

- One component per file. Filename matches component name in PascalCase.
- Keep layout, chart, panel, and page concerns separated.
- Prefer Tailwind utility classes. Use inline `style` only for dynamic visual
  values or Chart.js wrapper sizing.
- Prefer named exports. Existing default exports may remain if already established.
- All forms use controlled inputs. No uncontrolled/ref-based form patterns.

### Data Access

- **Never access `localStorage` directly in components or hooks.**
  All reads and writes go through `src/lib/qcStorage.ts`.
- **Components read `qcStorage` through the store, not by importing it.**
  Every dataset it owns — entries, lots, batches, violations, settings, staff —
  is cached by `qcApi`. Add an endpoint in `src/store/api/` rather than calling
  `qcStorage` from a component; a direct call is invisible to the cache and will
  go stale the moment anything writes.
  The one sanctioned exception is a point-in-time read needed to re-derive
  Westgard rules before writing the violations they imply. It is commented where
  it appears.
- **Cache tags mirror storage keys.** `streamId` is the disease/control/lot
  triple that keys the dataset; `controlId` covers every lot of one control, for
  writes that change which lot is active. Never widen a tag to make an
  invalidation work — that reintroduces the cross-disease refetching the tags
  exist to prevent.
- `src/utils/qc-calculations.ts` is the pure QC engine — Westgard evaluation,
  statistics, rolling CV, and CUSUM. No React imports, no side effects, fully
  unit-testable. There is no `westgard.ts` and no `statistics.ts`.

### State Management

Two kinds of state, kept apart on purpose:

| State | Home | Examples |
| --- | --- | --- |
| Server state (owned by `qcStorage`) | `qcApi` cache | entries, violations, lots, batches, settings, staff |
| Cross-cutting client state | Slices in `src/store/slices/` | auth session, violation inbox filters, report filters |
| Local UI state | `useState` in the owning component | dialog open/closed, form drafts, upload progress |

Do not move dialog or form state into the store. State that only one component
reads gains nothing from being global and loses locality by moving.

Read state with `useAppSelector` and `useAppDispatch` from `src/store/hooks.ts`,
never the untyped `useSelector` / `useDispatch`.

Cross-component refreshes are the cache's job. There is no event bus, and
components must not add one — a write invalidates a tag and every subscriber
refetches. Do not add manual reload counters or `window` events to force a
refresh; if something is not refreshing, the tag map is wrong.

### Imports

- Use the `@/` path alias for all app imports.
- Group imports in this order:
  1. External libraries
  2. Internal modules (`@/lib`, `@/hooks`, `@/components`, `@/pages`)
  3. Types
  4. Styles

---

## Critical Rules

These must not be violated without explicit discussion first.

1. Do not change the Levey-Jennings SD interpretation lightly. The ±3 SD
   boundary is a clinical requirement, not a styling choice.
2. Do not silently change Westgard rule behavior. Verify against the rule table
   above after any logic edit.
3. Do not normalize OD values into strings anywhere in the data pipeline.
   Parse at input; keep as `number`.
4. Do not make technician audit metadata optional as a long-term decision.
   The current UI gap is temporary.
5. Do not delete or mutate historical QC entries or audit records once real
   persistence is active. All historical data is append-only.
6. Do not change allowed disease or control slug values once data/history
   routing depends on them.
7. Do not make routing structure changes without confirming with the user first.
8. Do not access `localStorage` directly outside of `src/lib/qcStorage.ts`.
9. Do not install additional UI component libraries beyond shadcn/ui without
   confirming with the user first.
9b. Do not call `qcStorage` from a component. Go through an `qcApi` endpoint, and
   do not reintroduce window events or reload counters to sync components.
10. Do not use population SD (`/ n`). Always use sample SD (`/ (n - 1)`).
11. Supervisor sign-off locks entries permanently until explicitly reversed.
    Never allow silent edits to signed records.
12. Do not change the ZCMC export header format. It is an institutional
    requirement, not a design preference.

---

## Commands

```bash

# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## What To Confirm Before Changing

Pause and confirm with the user before touching any of the following:

- Westgard rule logic or violation interpretation
- SD scale, chart axis meaning, or QC threshold semantics
- Core domain data shapes in `src/types/qc.types.ts`
- Route structure or disease/control slug conventions
- Any persistence design that affects audit history
- Any deletion of historical run records
- The ZCMC institutional export header format
- Role permission boundaries
- Lot archival behavior for Positive/Negative controls

---

## Preferred Implementation Direction

When extending the monitor:

- Keep disease and control routing explicit and stable.
- Scope all data decisions to a disease/control/lot triple whenever possible.
- Treat `src/constants/monitor-config.ts` as the temporary source of truth for
  seeded monitor setup until real persistence is wired.
- Preserve the ability for supervisors to compare all 3 controls from the disease
  overview page.
- Keep the Levey-Jennings graph as the main visual focus of the individual
  control monitor page.
- When adding a new feature, check whether the implementation belongs in:
  - `src/pages/*` — route structure and page composition
  - `src/components/dashboard/QCDashboard.tsx` — main control monitor behavior
  - `src/constants/monitor-config.ts` — disease/control definitions and seeded data
  - `src/types/qc.types.ts` — shared data shapes
  - `src/lib/*` — pure business logic (storage, statistics, rules, exports)
  - `src/hooks/*` — React-facing data access and derived state
