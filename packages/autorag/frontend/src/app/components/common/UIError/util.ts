import { handleRestFailures } from 'mod-arch-core';
import type { UIError } from './types';
import { UIErrorInstance } from './UIErrorInstance';

export function isUIError(value: unknown): value is UIError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'type' in value &&
    value.type === 'UIError' &&
    'messageId' in value &&
    typeof value.messageId === 'string' &&
    'reason' in value &&
    typeof value.reason === 'string' &&
    'status' in value &&
    typeof value.status === 'number' &&
    (!('transactionId' in value) || typeof value.transactionId === 'string') &&
    'details' in value &&
    (value.details === null || (typeof value.details === 'object' && !Array.isArray(value.details)))
  );
}

export function normalizeErrorWithInstance(error: unknown): UIErrorInstance | null {
  if (error instanceof UIErrorInstance) {
    return error;
  }
  if (isUIError(error)) {
    return new UIErrorInstance(error);
  }
  return null;
}

export function throwUIError<T>(promise: Promise<T>): Promise<T> {
  return promise.then((result) => {
    if (isUIError(result)) {
      throw new UIErrorInstance(result);
    }
    return result;
  });
}

export function handleRestWithUIErrors<T>(promise: Promise<T>): Promise<T> {
  return promise
    .then((result) => {
      if (isUIError(result)) {
        throw new UIErrorInstance(result);
      }
      return handleRestFailures(Promise.resolve(result));
    })
    .catch((error: unknown) => {
      const uiError = normalizeErrorWithInstance(error);
      if (uiError) {
        throw uiError;
      }
      throw error;
    });
}
