import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { DateRange } from '@/lib/exportCatalog';
import type { DiseaseSlug } from '@/types/qc.types';

/**
 * What the reports page is scoped to.
 *
 * Assembling an accreditation export is a multi-step task — pick a disease, set a
 * period, generate one file, come back for the next. Holding the scope in a slice
 * means stepping away to check a chart does not silently reset the period the
 * previous export was built from.
 */
export type ReportFiltersState = {
  disease: DiseaseSlug | 'all';
  dateRange: DateRange;
};

const initialState: ReportFiltersState = {
  disease: 'all',
  dateRange: { from: null, to: null },
};

const reportFiltersSlice = createSlice({
  name: 'reportFilters',
  initialState,
  reducers: {
    setReportDisease(state, action: PayloadAction<DiseaseSlug | 'all'>) {
      state.disease = action.payload;
    },
    setReportDateRange(state, action: PayloadAction<DateRange>) {
      state.dateRange = action.payload;
    },
    clearReportDateRange(state) {
      state.dateRange = { from: null, to: null };
    },
  },
});

export const { setReportDisease, setReportDateRange, clearReportDateRange } =
  reportFiltersSlice.actions;

export const reportFiltersReducer = reportFiltersSlice.reducer;
