import React, { act } from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiServices } from '../../types';
import { HostApiContext } from '../../HostApiContext';
import { useAccessReview } from '../useAccessReview';

function createWrapper(checkAccess: jest.Mock): React.FC<{ children: React.ReactNode }> {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      HostApiContext.Provider,
      { value: { checkAccess } as unknown as HostApiServices },
      children,
    );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

describe('useAccessReview', () => {
  it('should return [false, false] initially', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const checkAccess = jest.fn(() => new Promise<boolean>(() => {}));
    const { result } = renderHook(
      () => useAccessReview({ verb: 'create', group: 'apps', resource: 'deployments' }),
      { wrapper: createWrapper(checkAccess) },
    );
    expect(result.current).toEqual([false, false]);
  });

  it('should return [true, true] when access is allowed', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(true));
    const { result } = renderHook(
      () => useAccessReview({ verb: 'create', group: 'apps', resource: 'deployments' }),
      { wrapper: createWrapper(checkAccess) },
    );

    await act(() => Promise.resolve());
    expect(result.current).toEqual([true, true]);
  });

  it('should return [false, true] when access is denied', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(false));
    const { result } = renderHook(
      () => useAccessReview({ verb: 'delete', group: 'apps', resource: 'deployments' }),
      { wrapper: createWrapper(checkAccess) },
    );

    await act(() => Promise.resolve());
    expect(result.current).toEqual([false, true]);
  });

  it('should not call checkAccess when shouldRunCheck is false', () => {
    const checkAccess = jest.fn(() => Promise.resolve(true));
    const { result } = renderHook(
      () => useAccessReview({ verb: 'get', group: 'apps', resource: 'deployments' }, false),
      { wrapper: createWrapper(checkAccess) },
    );

    expect(checkAccess).not.toHaveBeenCalled();
    expect(result.current).toEqual([false, false]);
  });

  it('should pass defaulted attributes to checkAccess', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(true));
    renderHook(() => useAccessReview({ verb: 'list' }), { wrapper: createWrapper(checkAccess) });

    await act(() => Promise.resolve());
    expect(checkAccess).toHaveBeenCalledWith({
      group: '',
      resource: '',
      subresource: '',
      verb: 'list',
      name: '',
      namespace: '',
    });
  });
});
