import { configureStore } from '@reduxjs/toolkit';

import { qcApi } from '@/store/api/qcApi';
import { authReducer } from '@/store/slices/authSlice';
import { reportFiltersReducer } from '@/store/slices/reportFiltersSlice';
import { violationFiltersReducer } from '@/store/slices/violationFiltersSlice';

// Imported for their side effects: each module calls `qcApi.injectEndpoints`, and
// an endpoint that is never injected has no hook to call.
import '@/store/api/entriesEndpoints';
import '@/store/api/lotsEndpoints';
import '@/store/api/overviewEndpoints';
import '@/store/api/settingsEndpoints';
import '@/store/api/violationsEndpoints';

/**
 * The application store.
 *
 * Two kinds of state live here, deliberately kept apart. `qcApi` caches everything
 * owned by `src/lib/qcStorage.ts` — entries, lots, batches, violations, settings,
 * staff — and is responsible for refetching it when a write makes it stale. The
 * slices hold client state that has no home in storage: who is signed in, and how
 * the violation inbox and reports page are currently scoped.
 *
 * Dialog and form state stays in the components that own it. State that only one
 * component reads gains nothing from being global and loses locality by moving.
 */
export const store = configureStore({
  reducer: {
    [qcApi.reducerPath]: qcApi.reducer,
    auth: authReducer,
    violationFilters: violationFiltersReducer,
    reportFilters: reportFiltersReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(qcApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
