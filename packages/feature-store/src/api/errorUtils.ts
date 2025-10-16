import { isCommonStateError } from '@odh-dashboard/internal/utilities/useFetch';
import { FeatureStoreError } from '../types/global';

const isError = (e: unknown): e is FeatureStoreError =>
  typeof e === 'object' &&
  e !== null &&
  ['code', 'message', 'detail', 'error_type', 'status_code'].some((key) => key in e);

export type ErrorWithDetail = Error & FeatureStoreError;

const hasDetail = (error: Error): error is ErrorWithDetail =>
  'detail' in error && typeof error.detail === 'string';

export const getFeatureStoreErrorMessage = (
  error: Error | undefined,
  fallbackMessage: string,
): string => {
  if (!error) {
    return fallbackMessage;
  }

  if (hasDetail(error)) {
    return error.detail || error.message || fallbackMessage;
  }

  return error.message || fallbackMessage;
};

export const handleFeatureStoreFailures = <T>(promise: Promise<T>): Promise<T> =>
  promise
    .then((result) => {
      if (isError(result)) {
        throw result;
      }
      return result;
    })
    .catch((e) => {
      if (isError(e)) {
        if (e.detail || e.error_type) {
          throw e;
        }
        throw e;
      }

      if (isCommonStateError(e)) {
        // Common state errors are handled by useFetchState at storage level, let them deal with it
        throw e;
      }
      // eslint-disable-next-line no-console
      console.error('Unknown feature store API error', e);
      throw new Error('Error communicating with feature store server');
    });
