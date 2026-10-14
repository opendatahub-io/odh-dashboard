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
