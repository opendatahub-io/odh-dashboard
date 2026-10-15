import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { errorCategory } from '#~/concepts/analyticsTracking/errorTrackingUtils';

describe('errorCategory', () => {
  it('should return a k8s status code category for K8sStatusError', () => {
    const error = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'workbenches odh-dashboard already exists',
      reason: 'AlreadyExists',
      code: 409,
    });
    expect(errorCategory(error)).toBe('k8s_409');
  });

  it('should return unknown_error for plain errors', () => {
    expect(errorCategory(new Error('raw API message with user data'))).toBe('unknown_error');
  });

  it.each([100, 200, 301, 400, 403, 409, 429, 500, 503, 599])(
    'should preserve numeric HTTP status code %s',
    (code) => {
      const error = new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        reason: 'TestFailure',
        code,
        message: 'UI-only diagnostic',
      });
      expect(errorCategory(error)).toBe(`k8s_${code}`);
    },
  );

  it.each([
    undefined,
    null,
    '',
    '403',
    'private-resource-name',
    false,
    { message: 'private-resource-name' },
    [403],
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    0,
    99,
    409.5,
    600,
    999,
  ])('should return unknown_error for malformed runtime code %p', (code) => {
    // The SDK discriminator accepts kind: Status without validating the remaining JSON fields.
    const status = { kind: 'Status', apiVersion: 'v1', code, message: 'private-resource-name' };
    const error = new K8sStatusError(status as ConstructorParameters<typeof K8sStatusError>[0]);

    expect(errorCategory(error)).toBe('unknown_error');
    expect(error.message).toBe('private-resource-name');
    expect(error.statusObject).toBe(status);
  });

  it('should not recognize a plain object with a code as a Kubernetes error', () => {
    expect(errorCategory({ kind: 'Status', code: 403, message: 'private-resource-name' })).toBe(
      'unknown_error',
    );
  });

  it('should return unknown_error for non-error values', () => {
    expect(errorCategory(undefined)).toBe('unknown_error');
    expect(errorCategory(null)).toBe('unknown_error');
    expect(errorCategory('some failure text')).toBe('unknown_error');
    expect(errorCategory({ message: 'raw API message' })).toBe('unknown_error');
  });

  it('should not include error message text in the returned category', () => {
    const error = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      code: 500,
      message: 'secret my-secret-name rejected',
      reason: 'InternalError',
    });
    expect(errorCategory(error)).not.toContain('my-secret-name');
    expect(errorCategory(new Error('user-provided-name'))).not.toContain('user-provided-name');
  });
});
