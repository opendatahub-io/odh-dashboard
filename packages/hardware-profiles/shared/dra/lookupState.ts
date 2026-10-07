import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import type { DraLookupState } from './types';

/** Maps a failed named GET to an explicit state; 403 and 404 are never conflated. */
export const getDraLookupErrorState = <T>(error: unknown): DraLookupState<T> => {
  const code = getGenericErrorCode(error);
  if (code === 404) {
    return { status: 'missing' };
  }
  if (code === 403) {
    return { status: 'forbidden' };
  }
  return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
};

/** Converts a `[data, loaded, error]` fetch result into a lookup state; loaded-but-empty is missing. */
export const toDraLookupState = <T>(
  resource: T | null | undefined,
  loaded: boolean,
  error?: unknown,
): DraLookupState<T> => {
  if (error) {
    return getDraLookupErrorState(error);
  }
  if (!loaded) {
    return { status: 'loading' };
  }
  if (resource === null || resource === undefined) {
    return { status: 'missing' };
  }
  return { status: 'loaded', resource };
};
