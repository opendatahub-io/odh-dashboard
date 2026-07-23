/* eslint-disable camelcase */
import type { UIError } from '../types';
import { UIErrorInstance } from '../UIErrorInstance';

const validUIError: UIError = {
  messageId: 'test_error',
  reason: 'Something went wrong',
  status: 400,
  transactionId: 'txn-123',
  details: { key: 'value' },
};

describe('UIErrorInstance', () => {
  it('should extend Error', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(instance).toBeInstanceOf(Error);
  });

  it('should set the name to "UIError"', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(instance.name).toBe('UIError');
  });

  it('should set the message to the reason', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(instance.message).toBe(validUIError.reason);
  });

  it('should copy all UIError fields', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(instance.messageId).toBe(validUIError.messageId);
    expect(instance.reason).toBe(validUIError.reason);
    expect(instance.status).toBe(validUIError.status);
    expect(instance.transactionId).toBe(validUIError.transactionId);
    expect(instance.details).toEqual(validUIError.details);
  });

  it('should generate a unique id', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(instance.id).toBeDefined();
    expect(typeof instance.id).toBe('string');
    expect(instance.id.length).toBeGreaterThan(0);
  });

  it('should generate different ids for separate instances from the same UIError', () => {
    const a = new UIErrorInstance(validUIError);
    const b = new UIErrorInstance(validUIError);
    expect(a.id).not.toBe(b.id);
  });

  it('should have an id that is a non-empty string', () => {
    const instance = new UIErrorInstance(validUIError);
    expect(typeof instance.id).toBe('string');
    expect(instance.id.length).toBeGreaterThan(0);
  });
});
