import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '@/store';

/**
 * Typed replacements for `useDispatch` and `useSelector`.
 *
 * Always use these rather than the untyped originals: the plain hooks lose
 * `RootState`, so selectors fall back to `any` and thunk dispatches stop
 * type-checking — which is precisely where the mistakes would be.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
