import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { getSession, signIn, signOut } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

/**
 * The signed-in session.
 *
 * This is client state with no server home — `lib/auth` reads it from
 * `sessionStorage`, so it never belongs in the query cache. It lives in a slice
 * rather than in `useAuth`'s own `useState` because three components consume the
 * session independently, and each one used to mount its own effect and re-read
 * storage. Now they share one read.
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous';

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  /** Message from the most recent failed sign-in, cleared on the next attempt. */
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  status: 'restoring',
  error: null,
};

/** Restores a session from storage on first mount, expiring it if it is stale. */
export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const session = await getSession();
  return session?.user ?? null;
});

export const signInUser = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    const result = await signIn(email, password);

    if ('error' in result) {
      return rejectWithValue(result.error);
    }

    return result.user;
  },
);

export const signOutUser = createAsyncThunk('auth/signOut', async () => {
  await signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Clears a stale sign-in error, for example when the form is reopened. */
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload === null ? 'anonymous' : 'authenticated';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.status = 'anonymous';
      })
      .addCase(signInUser.pending, (state) => {
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.error = null;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.user = null;
        state.status = 'anonymous';
        state.error = typeof action.payload === 'string' ? action.payload : 'Sign in failed';
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'anonymous';
        state.error = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;
