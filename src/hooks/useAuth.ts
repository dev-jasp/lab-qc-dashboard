import { useCallback, useEffect } from 'react';

import type { AuthUser } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSession, signInUser, signOutUser } from '@/store/slices/authSlice';

/**
 * Reads the signed-in session.
 *
 * The shape of what this returns is unchanged — it is still the interface every
 * consumer was written against — but the session now lives in the auth slice
 * instead of in this hook's own `useState`. Previously each caller mounted its own
 * effect and read `sessionStorage` independently, so `ProtectedRoute`,
 * `AppSidebar`, and `LoginPage` each restored the session separately and could
 * briefly disagree about whether anyone was signed in.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, status, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only the first mount restores; later mounts read the state it produced.
    if (status === 'restoring') {
      void dispatch(restoreSession());
    }
  }, [dispatch, status]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ user: AuthUser } | { error: string }> => {
      const result = await dispatch(signInUser({ email, password }));

      if (signInUser.fulfilled.match(result)) {
        return { user: result.payload };
      }

      return { error: typeof result.payload === 'string' ? result.payload : 'Sign in failed' };
    },
    [dispatch],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await dispatch(signOutUser());
  }, [dispatch]);

  return {
    user,
    loading: status === 'restoring',
    error,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    initials: user?.initials ?? '',
    isAdmin: user?.role === 'Admin',
    isSupervisor: user?.role === 'Supervisor' || user?.role === 'Admin',
    isAnalyst: true,
    signIn,
    signOut,
  };
}
