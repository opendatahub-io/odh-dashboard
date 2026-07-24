/* eslint-disable camelcase */
import { handleRestFailures } from 'mod-arch-core';
import { UIErrorInstance } from '../UIErrorInstance';
import type { UIError } from '../types';
import {
  isUIError,
  normalizeErrorWithInstance,
  throwUIError,
  handleRestWithUIErrors,
} from '../util';

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);

const validUIError: UIError = {
  messageId: 'test_error',
  reason: 'Something went wrong',
  status: 400,
  transactionId: 'txn-123',
  details: { key: 'value' },
};

describe('isUIError', () => {
  it('should return true for a valid UIError object', () => {
    expect(isUIError(validUIError)).toBe(true);
  });

  it('should return true when details is null', () => {
    expect(isUIError({ ...validUIError, details: null })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isUIError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isUIError(undefined)).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isUIError('error')).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isUIError(42)).toBe(false);
  });

  it('should return false for a standard Error', () => {
    expect(isUIError(new Error('fail'))).toBe(false);
  });

  it('should return false when messageId is missing', () => {
    const { messageId, ...rest } = validUIError;
    expect(messageId).toBeDefined();
    expect(isUIError(rest)).toBe(false);
  });

  it('should return false when messageId is not a string', () => {
    expect(isUIError({ ...validUIError, messageId: 123 })).toBe(false);
  });

  it('should return false when reason is missing', () => {
    const { reason, ...rest } = validUIError;
    expect(reason).toBeDefined();
    expect(isUIError(rest)).toBe(false);
  });

  it('should return false when status is not a number', () => {
    expect(isUIError({ ...validUIError, status: '400' })).toBe(false);
  });

  it('should return false when transactionId is missing', () => {
    const { transactionId, ...rest } = validUIError;
    expect(transactionId).toBeDefined();
    expect(isUIError(rest)).toBe(false);
  });

  it('should return false when details is a non-object', () => {
    expect(isUIError({ ...validUIError, details: 'string' })).toBe(false);
  });

  it('should return true for a UIErrorInstance', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(isUIError(instance)).toBe(true);
  });
});

describe('normalizeErrorWithInstance', () => {
  it('should return the same UIErrorInstance if already an instance', () => {
    const instance = new UIErrorInstance(validUIError);
    const result = normalizeErrorWithInstance(instance);
    expect(result).toBe(instance);
  });

  it('should wrap a plain UIError object into a UIErrorInstance', () => {
    const result = normalizeErrorWithInstance(validUIError);
    expect(result).toBeInstanceOf(UIErrorInstance);
    expect(result?.messageId).toBe(validUIError.messageId);
    expect(result?.reason).toBe(validUIError.reason);
    expect(result?.status).toBe(validUIError.status);
    expect(result?.transactionId).toBe(validUIError.transactionId);
    expect(result?.details).toEqual(validUIError.details);
  });

  it('should return null for a standard Error', () => {
    expect(normalizeErrorWithInstance(new Error('regular'))).toBeNull();
  });

  it('should return null for null', () => {
    expect(normalizeErrorWithInstance(null)).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(normalizeErrorWithInstance(undefined)).toBeNull();
  });

  it('should return null for a string', () => {
    expect(normalizeErrorWithInstance('error string')).toBeNull();
  });
});

describe('throwUIError', () => {
  it('should throw a UIErrorInstance when resolved value is a UIError', async () => {
    await expect(throwUIError(Promise.resolve(validUIError))).rejects.toThrow(UIErrorInstance);
  });

  it('should return the resolved value when it is not a UIError', async () => {
    const data = { result: 'ok' };
    await expect(throwUIError(Promise.resolve(data))).resolves.toEqual(data);
  });

  it('should propagate rejections from the original promise', async () => {
    const error = new Error('network failure');
    await expect(throwUIError(Promise.reject(error))).rejects.toThrow('network failure');
  });

  it('should preserve UIError fields on the thrown instance', async () => {
    try {
      await throwUIError(Promise.resolve(validUIError));
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UIErrorInstance);
      const instance = e as UIErrorInstance;
      expect(instance.messageId).toBe(validUIError.messageId);
      expect(instance.transactionId).toBe(validUIError.transactionId);
    }
  });
});

describe('handleRestWithUIErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p) => p);
  });

  it('should call handleRestFailures then throwUIError', async () => {
    const data = { result: 'ok' };
    const result = await handleRestWithUIErrors(Promise.resolve(data));

    expect(mockHandleRestFailures).toHaveBeenCalledTimes(1);
    expect(result).toEqual(data);
  });

  it('should throw a UIErrorInstance when the result is a UIError after handleRestFailures', async () => {
    await expect(handleRestWithUIErrors(Promise.resolve(validUIError))).rejects.toThrow(
      UIErrorInstance,
    );
  });

  it('should propagate errors from handleRestFailures', async () => {
    mockHandleRestFailures.mockImplementation(() => Promise.reject(new Error('rest failure')));
    await expect(handleRestWithUIErrors(Promise.resolve('data'))).rejects.toThrow('rest failure');
  });
});
