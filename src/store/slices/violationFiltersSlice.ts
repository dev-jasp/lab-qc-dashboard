import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { DiseaseSlug, WestgardRule } from '@/types/qc.types';

/**
 * How the violation inbox is currently filtered.
 *
 * Client state with no server home, and deliberately outside the query cache: it
 * describes what the supervisor is looking at, not what is stored. Keeping it in a
 * slice means a supervisor who opens a violation, follows it into the history page,
 * and comes back still sees the view they set up.
 */
export type ViolationView = 'open' | 'all';

export type ViolationFiltersState = {
  view: ViolationView;
  disease: DiseaseSlug | 'all';
  severity: 'all' | 'rejection' | 'warning';
  rule: WestgardRule | 'all';
};

const initialState: ViolationFiltersState = {
  view: 'open',
  disease: 'all',
  severity: 'all',
  rule: 'all',
};

const violationFiltersSlice = createSlice({
  name: 'violationFilters',
  initialState,
  reducers: {
    setViolationView(state, action: PayloadAction<ViolationView>) {
      state.view = action.payload;
    },
    setViolationDisease(state, action: PayloadAction<DiseaseSlug | 'all'>) {
      state.disease = action.payload;
    },
    setViolationSeverity(state, action: PayloadAction<ViolationFiltersState['severity']>) {
      state.severity = action.payload;
    },
    setViolationRule(state, action: PayloadAction<WestgardRule | 'all'>) {
      state.rule = action.payload;
    },
    /** Resets everything except the open/all view, which is a navigation choice. */
    clearViolationFilters(state) {
      state.disease = 'all';
      state.severity = 'all';
      state.rule = 'all';
    },
  },
});

export const {
  setViolationView,
  setViolationDisease,
  setViolationSeverity,
  setViolationRule,
  clearViolationFilters,
} = violationFiltersSlice.actions;

export const violationFiltersReducer = violationFiltersSlice.reducer;
