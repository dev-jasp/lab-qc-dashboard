# Product Requirements Document
# QC Pulse - Quality Control Monitor

**Version:** 1.0  
**Status:** Draft  
**Prepared by:** Jaspher Gargar   
**Last Updated:** February 2026  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Users & Stakeholders](#4-users--stakeholders)
5. [Scope — V1 Features](#5-scope--v1-features)
6. [Feature Requirements](#6-feature-requirements)
7. [Out of Scope (V2+)](#7-out-of-scope-v2)
8. [Technical Constraints](#8-technical-constraints)
9. [Data & Backend](#9-data--backend)
10. [Design Principles](#10-design-principles)
11. [Open Questions](#11-open-questions)
12. [Milestones](#12-milestones)

---

## 1. Summary

**QC Pulse** is a web-based Quality Control (QC) monitoring application for clinical and diagnostic laboratories. It enables laboratory technicians to record, visualize, and evaluate control sample results in real time using industry-standard statistical methods — specifically Levey-Jennings charting and Westgard multi-rule analysis.

The goal of V1 is to deliver a reliable, regulation-aware QC monitoring tool that replaces manual spreadsheet-based tracking, reduces human error in violation detection, and provides a defensible audit trail for accreditation purposes.

---

## 2. Problem Statement

Clinical laboratories are required to perform Quality Control testing to ensure the accuracy and reliability of patient results. Today, many labs manage this process through:

- Manual entry into Excel spreadsheets
- Visual inspection of printed Levey-Jennings charts
- Informal communication when a violation is detected

This approach is error-prone, time-consuming, and difficult to audit. Westgard rule violations can be missed or misidentified, and there is no standardized way to document corrective actions taken.

**QC Pulse** addresses this by providing a purpose-built digital tool that automates violation detection, structures the recording workflow, and maintains a complete, timestamped audit trail.

---

## 3. Goals & Success Metrics

### Goals

- Automate Westgard rule evaluation on every recorded QC run
- Provide a clear, readable Levey-Jennings chart with real-time updates
- Maintain a tamper-evident history of all QC submissions
- Allow export of QC data and reports in formats suitable for accreditation review
- Support lot and reagent management per analyte

### Success Metrics

| Metric | Target |
|---|---|
| Time to record a QC run | < 30 seconds |
| Westgard rule detection accuracy | 100% per defined ruleset |
| Report generation time | < 5 seconds |
| Zero data loss on submission | Required |
| Audit trail completeness | Every submission logged with user + timestamp |

---

## 4. Users & Stakeholders

### Primary User — Laboratory Technician

- Records OD values from control runs throughout the day
- Needs to quickly see if a run is in or out of control
- Works primarily on a desktop workstation in a lab environment
- Not necessarily technical; UI must be clear and action-oriented

### Secondary User — Laboratory Manager / QC Supervisor

- Reviews historical trends and inter-lot performance
- Generates reports for internal review and external accreditation
- Needs confidence that the system's rule logic is correct and auditable

### Stakeholder — Accreditation / Compliance

- Requires documented evidence of QC monitoring (CAP, CLIA standards)
- Needs audit trail entries to be immutable and user-attributed
- Export formats must be suitable for submission or inspection

---

## 5. Scope — V1 Features

The following features are in scope for the V1 release:

| # | Feature |
|---|---|
| 1 | Levey-Jennings Control Chart |
| 2 | Westgard Rules Engine |
| 3 | CUSUM Chart |
| 4 | Record Sample Submission |
| 5 | History & Audit Trail |
| 6 | Report Export (PDF / CSV) |
| 7 | Settings & Lot Management |

---

## 6. Feature Requirements

---

### 6.1 Levey-Jennings Control Chart

**Description:**  
A real-time line chart plotting OD values over sequential run numbers. Reference lines at ±1SD, ±2SD, and ±3SD are drawn relative to the established mean for the current lot.

**Requirements:**

- Display up to the last 20–30 runs by default with a scrollable/zoomable range
- Show reference lines at Mean, ±1SD, ±2SD, ±3SD at all times
- Points that violate a Westgard rule must be visually flagged (distinct color or marker)
- Chart must update immediately after a new run is submitted
- Toggle between Daily and Weekly view
- Tooltip on hover: run number, OD value, SD position, timestamp, technician ID
- Chart is scoped to the currently selected lot and analyte level

**Acceptance Criteria:**

- [ ] All SD reference lines render correctly at the correct computed positions
- [ ] Violation points are visually distinct from in-control points
- [ ] Chart re-renders within 500ms of a new submission
- [ ] Tooltip displays all required fields on hover

---

### 6.2 Westgard Rules Engine

**Description:**  
An automated rule evaluation engine that analyzes each new OD submission against the current run history and flags violations according to the standard Westgard multi-rule system.

**Rules to implement:**

| Rule | Description | Classification |
|---|---|---|
| 1₂s | 1 point > ±2SD | Warning |
| 1₃s | 1 point > ±3SD | Reject — Random error |
| 2₂s | 2 consecutive points > same ±2SD | Reject — Systematic error |
| R₄s | Range between consecutive points > 4SD | Reject — Random error |
| 4₁s | 4 consecutive points > same ±1SD | Reject — Systematic error |
| 10x̄ | 10 consecutive points on same side of mean | Reject — Systematic error |

**Requirements:**

- Engine evaluates all rules on every new submission
- Rules are evaluated in order; all triggered rules are reported (not just the first)
- Status output: `NORMAL`, `WARNING`, or `REJECT` with rule name(s) cited
- Violation must be stored alongside the run record in the audit trail
- Status indicator on the Monitor dashboard reflects current evaluation result

**Acceptance Criteria:**

- [ ] Each rule fires correctly against a known test dataset
- [ ] Multiple simultaneous rule violations are all reported
- [ ] Status chip updates on every new submission
- [ ] Violation rule name(s) are displayed to the user and stored in the log

---

### 6.3 CUSUM Chart

**Description:**  
A Cumulative Sum (CUSUM) chart displayed alongside the Levey-Jennings chart. Detects systematic drift and bias that Levey-Jennings alone may miss early.

**Requirements:**

- Plots cumulative sum of deviations from the mean over run sequence
- Upper and lower CUSUM limits configurable in Settings (default: ±5 × SD)
- Breach of CUSUM limit triggers a warning state
- Displayed in a panel below or alongside the Levey-Jennings chart on desktop

**Acceptance Criteria:**

- [ ] CUSUM values computed correctly from run history
- [ ] Limit breach is visually indicated on the chart
- [ ] CUSUM resets correctly when a new lot is started

---

### 6.4 Record Sample Submission

**Description:**  
A form allowing the technician to submit a new QC run recording. This is the primary data entry interaction in the application.

**Requirements:**

- Fields: OD Value (numeric), Batch ID, Technician ID (required, never optional)
- OD value must be validated as a positive float before submission
- Submission triggers immediate Westgard evaluation and chart update
- On successful submission: show a confirmation toast with the result status
- On violation: show a modal prompting the technician to choose an action:
  - Accept with comment (requires free-text reason)
  - Repeat run
  - Reject batch
- All submissions and actions are written to the audit trail
- Keyboard-friendly: Tab through fields, Enter to submit

**Acceptance Criteria:**

- [ ] Invalid OD values (negative, non-numeric, empty) are rejected with inline error
- [ ] Technician ID field cannot be submitted empty
- [ ] Violation modal appears correctly for REJECT-level Westgard results
- [ ] Corrective action and comment are stored alongside the run record
- [ ] Confirmation toast appears within 300ms of successful submission

---

### 6.5 History & Audit Trail

**Description:**  
A dedicated History page showing a complete, chronological log of all QC run submissions. Entries are append-only and must never be deleted or modified.

**Requirements:**

- Table columns: Timestamp, Run #, OD Value, Batch ID, Technician ID, Status, Westgard Rule (if violated), Action Taken
- Filterable by: date range, lot number, status (Normal / Warning / Reject), technician
- Sortable by timestamp (default: newest first)
- Each row expandable to show full detail including corrective action comments
- No delete or edit controls — entries are read-only
- Pagination or virtualized scroll for large datasets

**Acceptance Criteria:**

- [ ] All submissions appear in the audit trail immediately after recording
- [ ] Filters narrow results correctly
- [ ] No UI affordance for editing or deleting records
- [ ] Expanded row shows all stored fields including comments

---

### 6.6 Report Export (PDF / CSV)

**Description:**  
Allows the laboratory manager to export QC data for a selected date range and lot as a formatted PDF report or a raw CSV for further analysis.

**Requirements:**

- **PDF export:** Includes lab name, lot number, date range, mean/SD summary, Levey-Jennings chart snapshot, full run log table, and any violations with actions taken
- **CSV export:** Raw run data — one row per run, all fields included
- Date range selector before export
- Export scoped to current lot/analyte by default, with option to change
- PDF must be print-ready (A4 / Letter format)

**Acceptance Criteria:**

- [ ] PDF renders Levey-Jennings chart as a static image (not interactive)
- [ ] All run records within the selected date range appear in both exports
- [ ] CSV columns match the History table columns exactly
- [ ] Files download correctly in modern browsers

---

### 6.7 Settings & Lot Management

**Description:**  
A Settings page for configuring lab-level parameters and managing reagent lots.

**Requirements:**

- **Lot Management:** Create new lot with: lot number, analyte name, established mean, established SD, start date. Archive (not delete) expired lots.
- **Lab Configuration:** Lab name, default technician ID (pre-fills submission form), CUSUM limit multiplier
- **Level Selection:** Toggle between QC Level 1 and Level 2 (each level has its own mean/SD)
- Active lot is persisted across sessions
- Changing the active lot resets the chart view but does not affect history

**Acceptance Criteria:**

- [ ] New lot can be created with all required fields
- [ ] Archived lots appear in history but not in the active lot selector
- [ ] Switching lots updates the chart and stats immediately
- [ ] Lab configuration persists across page refreshes

---

## 7. Out of Scope (V2+)

The following features are explicitly deferred to future versions:

- Multi-analyte side-by-side view
- Peer group / interlaboratory comparison data
- User authentication and role-based access control
- Push notifications / real-time alerts
- Mobile-native app
- Integration with LIS (Laboratory Information Systems)
- Automated reagent lot import via barcode scan

---

## 8. Technical Constraints

- **Browser support:** Latest 2 versions of Chrome, Firefox, Safari, Edge
- **Performance:** Chart must render within 500ms for datasets up to 200 runs
- **Accessibility:** WCAG 2.1 AA compliance for all interactive elements
- **No PHI:** This application handles QC control samples only — no patient data is ever entered or stored
- **Tech stack:** React + TypeScript, Vite, React Router v6, Tailwind CSS, Recharts

---

## 9. Data & Backend

The backend architecture for V1 is **not yet decided**. The following options are under consideration:

| Option | Trade-offs |
|---|---|
| Local/mock data (no backend) | Fast to build, not production-ready, no persistence across devices |
| REST API (custom backend) | Full persistence and multi-user support, requires additional build time |

**Decision required before:** Start of Feature 6.5 (History & Audit Trail), as persistence strategy directly affects how run records are stored and retrieved.

**Temporary approach for development:** Mock data layer with a consistent interface (`src/lib/dataService.ts`) so the backend can be swapped in without changing component code.

---

## 10. Design Principles

1. **Clarity over cleverness** — Lab technicians need to act fast. Status, values, and actions must be immediately readable without interpretation.
2. **Violation visibility** — A QC reject must never be easy to miss. Color, iconography, and modal interruption are all appropriate.
3. **Desktop-first** — Primary users are at workstations. Mobile is a secondary viewing context, not an input context.
4. **Audit integrity** — The system must never give the impression that records can be altered. Read-only history is a trust signal, not a limitation.
5. **Domain accuracy** — Statistical computations (SD, CUSUM, Westgard) must be correct. UI polish is secondary to computational correctness.

---

## 11. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | What backend/persistence approach will be used for V1? | Dev | Before History feature |
| 2 | Should technician ID be a free-text field or a predefined list? | Stakeholder | Before submission form build |
| 3 | What export format does the accreditation body require — specific PDF template? | Client | Before export feature |
| 4 | Will the app be used by a single lab or multiple labs (multi-tenancy)? | Stakeholder | Before Settings build |
| 5 | Are Level 1 and Level 2 QC always run together, or independently? | Domain expert | Before multi-level feature design |

---

## 12. Milestones

| Milestone | Deliverable | Status |
|---|---|---|
| M0 — Foundation | Project scaffold, routing, mock data layer | 🟡 In Progress |
| M1 — Core Chart | Levey-Jennings chart with static mock data | ⬜ Pending |
| M2 — Rules Engine | Westgard engine + violation flagging on chart | ⬜ Pending |
| M3 — Submission Flow | Record Sample form + toast + violation modal | ⬜ Pending |
| M4 — CUSUM | CUSUM chart panel wired to live data | ⬜ Pending |
| M5 — History | Audit trail page with filters | ⬜ Pending |
| M6 — Export | PDF + CSV export | ⬜ Pending |
| M7 — Settings | Lot management + lab config | ⬜ Pending |
| M8 — Polish & QA | Cross-browser testing, accessibility, performance | ⬜ Pending |
| **V1 Release** | All M1–M8 complete | ⬜ Pending |
