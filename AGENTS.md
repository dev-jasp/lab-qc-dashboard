# AGENTS.md - Precision Archive

This file is the source of truth for agentic coding sessions on this project.
Read it fully before touching any code.

---

## Project Overview

**Precision Archive** is a web-based clinical laboratory QC monitor.
It performs Levey-Jennings analysis on Optical Density (OD) runs, surfaces Westgard-style QC status, and is being organized into disease-specific monitor flows for surveillance work.

The current product direction is:

- `/monitor` is the disease selector landing page.
- `/monitor/:disease` is a disease overview page showing all 3 controls at a glance.
- `/monitor/:disease/:control` is the full control monitor with chart, run statistics, record form, and rule/status panels.

Primary users are laboratory technicians and supervisors working at desktop workstations, with a secondary mobile view for quick checks.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React + TypeScript | UI framework and type safety |
| Vite | Dev server and bundler |
| React Router v6 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Chart.js | Levey-Jennings chart rendering |
| Lucide React | UI icons |

---

## Current Structure

```text
lab-qc-dashboard/
|- public/
|- src/
|  |- components/
|  |  |- chart/
|  |  |  |- LeveyJenningsChart.tsx
|  |  |- dashboard/
|  |  |  |- QCDashboard.tsx
|  |  |- layout/
|  |  |  |- DashboardHeader.tsx
|  |  |  |- Footer.tsx
|  |  |- panels/
|  |  |  |- InputPanel.tsx
|  |  |  |- QCRulesPanel.tsx
|  |  |  |- StatisticsPanel.tsx
|  |  |- ui/
|  |     |- Button.tsx
|  |     |- Input.tsx
|  |     |- Toast.tsx
|  |- constants/
|  |  |- monitor-config.ts
|  |  |- qc-rules.ts
|  |- hooks/
|  |  |- useQCLogic.ts
|  |  |- useToast.ts
|  |- pages/
|  |  |- ControlMonitor.tsx
|  |  |- DiseaseOverview.tsx
|  |  |- DiseaseSelector.tsx
|  |  |- History.tsx
|  |  |- Settings.tsx
|  |- types/
|  |  |- qc.types.ts
|  |- utils/
|  |  |- chart-config.ts
|  |  |- export.ts
|  |  |- qc-calculations.ts
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

- The chart folder is currently `src/components/chart/`, not `charts/`.
- Shared monitor seeds and disease/control metadata live in `src/constants/monitor-config.ts`.
- The full monitor experience is still powered by `QCDashboard.tsx`, which is reused by the route-level pages.

---

## Routing Structure

```text
/                              -> redirect to /monitor
/monitor                       -> DiseaseSelector.tsx
/monitor/:disease              -> DiseaseOverview.tsx
/monitor/:disease/:control     -> ControlMonitor.tsx
/history                       -> History.tsx
/settings                      -> Settings.tsx
```

Router implementation details:

- Uses React Router v6 with `createBrowserRouter` and `<RouterProvider>`.
- Route definitions live in `src/router.tsx`.
- App entry wires the router in `src/App.tsx`.

Allowed `:disease` params:

- `measles`
- `rubella`
- `rotavirus`
- `japanese-encephalitis`
- `dengue`

Allowed `:control` params:

- `in-house-control`
- `positive-control`
- `negative-control`

---

## Domain Knowledge

This is a clinical laboratory QC application. Domain correctness matters more than cosmetic speed.

### Key Concepts

- **OD (Optical Density / Absorbance)**: numeric run value stored as `number`.
- **Mean and SD**: baseline central tendency and spread used for QC interpretation.
- **Levey-Jennings Chart**: sequential OD chart with mean and SD reference lines.
- **Westgard Rules**: QC interpretation rules used to identify warning and reject conditions.
- **Control Types**: each disease currently has 3 control streams:
  - In-house Control
  - Positive Control
  - Negative Control
- **Protocol No.**: user-entered run label currently used in the chart x-axis and recent logs.
- **Lot**: reagent lot identifier. This remains a domain requirement even if a specific UI field is not currently exposed.
- **Technician ID**: required audit metadata at the domain level, even though current mocked UI flows are not yet persisting it.
- **Percent CV**: `(SD / Mean) x 100`.

### Westgard Rules Reference

| Rule | Trigger Condition | Error Type |
|---|---|---|
| `1_2s` | 1 point exceeds +/-2 SD | Warning |
| `1_3s` | 1 point exceeds +/-3 SD | Random error - reject |
| `2_2s` | 2 consecutive points exceed the same +/-2 SD | Systematic error - reject |
| `R_4s` | 1 point exceeds +2 SD and the next exceeds -2 SD, or vice versa | Random error - reject |
| `4_1s` | 4 consecutive points exceed the same +/-1 SD | Systematic error - reject |
| `10x` | 10 consecutive points fall on the same side of the mean | Systematic error - reject |

---

## Current UI State

What exists today:

- A landing page at `/monitor` with disease cards.
- A disease overview page that shows all 3 controls for a disease side by side.
- A control monitor page that reuses the existing QC dashboard for a specific disease/control pair.
- Seeded mock chart data per disease and control in `src/constants/monitor-config.ts`.
- Run statistics grouped above the graph.
- Input form above the chart, with current status beside it starting at the `lg` breakpoint.
- `Protocol No.` input replacing the old sample number label in the chart flow.
- Manrope applied as the primary UI and chart font.

What is still incomplete or transitional:

- Chart data is still mock/seeded rather than persisted per disease/control.
- `History` and `Settings` are scaffolded route pages, not full feature-complete modules.
- Technician ID capture is still a domain requirement but is not fully wired in the current monitor submission UI.
- The project currently uses Chart.js only; there is no live CUSUM page/component yet.
- The current rule/status flow should be treated carefully because this is still an early-stage clinical QC app.

---

## Coding Conventions

### TypeScript

- Use `type` for data shapes and `interface` for component props.
- Never use `any`. Use `unknown` and narrow when needed.
- Keep OD values as `number` throughout the data pipeline.
- Favor explicit unions for disease and control slugs.

### Components

- One component per file. Filename matches component name in PascalCase.
- Keep layout, chart, panel, and page concerns separated.
- Prefer Tailwind utility classes. Use inline `style` only when it is genuinely helpful for dynamic visual values or chart wrappers.
- Prefer named exports for new components. Existing default exports may remain if already established in the file.

### Imports

- Use the `@/` path alias for app imports.
- Group imports in this order:
  - external libraries
  - internal modules
  - types
  - styles

### Editing Notes

- The app uses a mix of route-level pages and reusable dashboard/panel components.
- When changing monitor behavior, check whether the right edit belongs in:
  - `src/pages/*` for route structure and page composition
  - `src/components/dashboard/QCDashboard.tsx` for the main control monitor behavior
  - `src/constants/monitor-config.ts` for disease/control definitions and seeded data
  - `src/types/qc.types.ts` for shared data shapes

---

## Critical Rules

These must not be violated without explicit discussion first.

1. Do not change the Levey-Jennings SD interpretation lightly. The +/-3 SD boundary is a clinical requirement, not just a styling choice.
2. Do not silently change Westgard-style rule behavior without a manual verification pass against the rule table above.
3. Do not normalize OD values into strings in domain data. Parse at the input edge and keep them as `number`.
4. Do not make technician audit metadata optional as a long-term domain decision. The current UI gap is temporary, not a new rule.
5. Do not delete or mutate historical QC records once real persistence is wired. Audit data must remain append-only.
6. Do not change allowed disease or control slug values casually once data/history routing depends on them.
7. Do not make routing structure changes without confirming with the user first.

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

---

## Preferred Implementation Direction

When extending the monitor:

- Keep disease and control routing explicit and stable.
- Scope data and UI decisions to a disease/control pair whenever possible.
- Treat `src/constants/monitor-config.ts` as the temporary source of truth for seeded monitor setup.
- Preserve the ability for supervisors to compare all 3 controls from the disease overview page.
- Keep the graph as the main visual focus of the individual control monitor page.
