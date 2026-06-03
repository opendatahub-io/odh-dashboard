import { isCommonStateError } from '@odh-dashboard/internal/utilities/useFetch';
import { transformError } from './transforms';
import { FeatureStoreError } from '../types/global';

// Detects raw Feast API error responses (snake_case fields, not yet transformed).
// Requires at least one definitive snake_case key to avoid false positives on
// unrelated objects that merely carry 'code' or 'detail'.
const isRawApiError = (e: unknown): e is Record<string, unknown> =>
  typeof e === 'object' &&
  e !== null &&
  !(e instanceof Error) &&
  !('errorType' in e) &&
  !('statusCode' in e) &&
  ('error_type' in e || 'status_code' in e);

const isTransformedApiError = (e: unknown): e is FeatureStoreError =>
  typeof e === 'object' &&
  e !== null &&
  !(e instanceof Error) &&
  ('errorType' in e || 'statusCode' in e);

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
      if (isRawApiError(result)) {
        throw transformError(result);
      }
      return result;
    })
    .catch((e) => {
      if (isRawApiError(e)) {
        throw transformError(e);
      }

      if (isTransformedApiError(e)) {
        throw e;
      }

      if (isCommonStateError(e)) {
        throw e;
      }

      if (e instanceof Error) {
        throw e;
      }
      // eslint-disable-next-line no-console
      console.error('Unknown feature store API error', e);
      throw new Error('Error communicating with feature store server');
    });
