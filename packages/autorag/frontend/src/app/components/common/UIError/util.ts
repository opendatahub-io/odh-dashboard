import type { UIError } from './types';

export function isUIError(value: unknown): value is UIError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'messageId' in value &&
    typeof value.messageId === 'string' &&
    'reason' in value &&
    typeof value.reason === 'string' &&
    'status' in value &&
    typeof value.status === 'number' &&
    'transactionId' in value &&
    typeof value.transactionId === 'string' &&
    'details' in value &&
    (value.details === null || typeof value.details === 'object')
  );
}

export function throwUIError<T>(promise: Promise<T>): Promise<T> {
  return promise.then((result) => {
    if (isUIError(result)) {
      throw result;
    }
    return result;
  });
}
