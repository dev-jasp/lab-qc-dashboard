import { describe, expect, it } from 'vitest';

import { authReducer, clearAuthError, restoreSession, signInUser, signOutUser } from './authSlice';
import type { AuthState } from './authSlice';
import type { AuthUser } from '@/lib/auth';

const USER: AuthUser = {
  id: 'mock-supervisor',
  email: 'supervisor@vpdrl.com',
  name: 'Lab Supervisor',
  role: 'Supervisor',
  initials: 'LS',
};

const initial = (): AuthState => authReducer(undefined, { type: '@@INIT' });

describe('authReducer', () => {
  it('starts out restoring so the app does not redirect before the session is read', () => {
    // The guard renders a spinner while restoring; an 'anonymous' initial state
    // would bounce a signed-in user to the login page on every refresh.
    expect(initial()).toEqual({ user: null, status: 'restoring', error: null });
  });

  it('marks a restored session authenticated', () => {
    const state = authReducer(initial(), restoreSession.fulfilled(USER, '', undefined));

    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(USER);
  });

  it('settles to anonymous when there is no stored session', () => {
    const state = authReducer(initial(), restoreSession.fulfilled(null, '', undefined));

    expect(state.status).toBe('anonymous');
    expect(state.user).toBeNull();
  });

  it('settles to anonymous when the session cannot be read', () => {
    // Storage failures must not leave the app stuck on the loading spinner.
    const state = authReducer(initial(), restoreSession.rejected(new Error('boom'), '', undefined));

    expect(state.status).toBe('anonymous');
  });

  it('stores the user on a successful sign in', () => {
    const state = authReducer(
      initial(),
      signInUser.fulfilled(USER, '', { email: USER.email, password: 'Super@2025' }),
    );

    expect(state).toEqual({ user: USER, status: 'authenticated', error: null });
  });

  it('surfaces the rejection message without signing anyone in', () => {
    const state = authReducer(
      initial(),
      signInUser.rejected(null, '', { email: 'x@y.z', password: 'wrong' }, 'Invalid email or password'),
    );

    expect(state.user).toBeNull();
    expect(state.status).toBe('anonymous');
    expect(state.error).toBe('Invalid email or password');
  });

  it('clears a previous error when a new attempt begins', () => {
    const failed = authReducer(
      initial(),
      signInUser.rejected(null, '', { email: 'x@y.z', password: 'wrong' }, 'Invalid email or password'),
    );
    const retrying = authReducer(
      failed,
      signInUser.pending('', { email: 'x@y.z', password: 'right' }),
    );

    expect(retrying.error).toBeNull();
  });

  it('clears the user on sign out', () => {
    const signedIn = authReducer(initial(), signInUser.fulfilled(USER, '', {
      email: USER.email,
      password: 'Super@2025',
    }));
    const signedOut = authReducer(signedIn, signOutUser.fulfilled(undefined, '', undefined));

    expect(signedOut).toEqual({ user: null, status: 'anonymous', error: null });
  });

  it('clears a stale error on request', () => {
    const failed = authReducer(
      initial(),
      signInUser.rejected(null, '', { email: 'x@y.z', password: 'wrong' }, 'Invalid email or password'),
    );

    expect(authReducer(failed, clearAuthError()).error).toBeNull();
  });
});
