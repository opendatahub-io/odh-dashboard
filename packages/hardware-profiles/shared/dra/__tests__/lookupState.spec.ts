import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  mock403Error,
  mock404Error,
  mock500Error,
} from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { getDraLookupErrorState, toDraLookupState } from '../lookupState';

describe('getDraLookupErrorState', () => {
  it.each<[string, unknown, unknown]>([
    ['a 404 K8s status', new K8sStatusError(mock404Error({})), { status: 'missing' }],
    ['a 403 K8s status', new K8sStatusError(mock403Error({})), { status: 'forbidden' }],
  ])('should classify %s', (_label, error, expected) => {
    expect(getDraLookupErrorState(error)).toEqual(expected);
  });

  it('should keep a 500 K8s status as a generic error', () => {
    const error = new K8sStatusError(mock500Error({}));
    expect(getDraLookupErrorState(error)).toEqual({ status: 'error', error });
  });

  it('should keep a plain Error as a generic error', () => {
    const error = new Error('network down');
    expect(getDraLookupErrorState(error)).toEqual({ status: 'error', error });
  });

  it('should wrap a non-Error value', () => {
    const state = getDraLookupErrorState('boom');
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBeInstanceOf(Error);
      expect(state.error.message).toBe('boom');
    }
  });
});

describe('toDraLookupState', () => {
  it('should prioritize an error over loaded data', () => {
    const claim = mockResourceClaim({});
    expect(toDraLookupState(claim, true, new K8sStatusError(mock404Error({})))).toEqual({
      status: 'missing',
    });
  });

  it.each<[string, unknown]>([
    ['undefined', undefined],
    ['null', null],
  ])('should be loading while not loaded with %s data', (_label, resource) => {
    expect(toDraLookupState(resource, false)).toEqual({ status: 'loading' });
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
  ])('should be missing when loaded with %s', (_label, resource) => {
    expect(toDraLookupState(resource, true)).toEqual({ status: 'missing' });
  });

  it('should return the loaded resource', () => {
    const claim = mockResourceClaim({});
    expect(toDraLookupState(claim, true)).toEqual({ status: 'loaded', resource: claim });
  });
});
