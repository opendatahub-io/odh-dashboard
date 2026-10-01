import React, { act } from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiCoreServices } from '../../types';
import { HostApiCoreContext } from '../../HostApiCoreContext';
import { useAccessReviewState } from '../useAccessReviewState';

const createWrapper = (reviewAccess?: HostApiCoreServices['reviewAccess']) => {
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const defaults = React.useContext(HostApiCoreContext);
    return React.createElement(
      HostApiCoreContext.Provider,
      { value: { ...defaults, reviewAccess, checkAccess: () => Promise.resolve(true) } },
      children,
    );
  };
  return Wrapper;
};

describe('useAccessReviewState', () => {
  it.each([true, false])('should settle permission checks (allowed: %s)', async (allowed) => {
    const rendered = renderHook(
      () =>
        useAccessReviewState({
          verb: 'patch',
          name: 'a',
          namespace: 'project-a',
          resource: 'configs',
        }),
      { wrapper: createWrapper(async () => allowed) },
    );
    expect(rendered).hookToHaveUpdateCount(1);
    expect(rendered.result.current.state).toBe('loading');
    await act(() => Promise.resolve());
    expect(rendered.result.current.state).toBe(allowed ? 'allowed' : 'denied');
    expect(rendered).hookToHaveUpdateCount(2);
  });

  it('should settle a rejected request as an error instead of spinning or granting access', async () => {
    const error = new Error('SSAR unavailable');
    const { result } = renderHook(() => useAccessReviewState({ verb: 'list' }), {
      wrapper: createWrapper(async () => {
        throw error;
      }),
    });
    await act(() => Promise.resolve());
    expect(result.current).toEqual({ state: 'error', error });
  });

  it('should fail closed without the strict contract even when legacy access would allow it', async () => {
    const { result } = renderHook(() => useAccessReviewState({ verb: 'list' }), {
      wrapper: createWrapper(),
    });
    await act(() => Promise.resolve());
    expect(result.current.state).toBe('error');
  });

  it('should revoke stale permission immediately when the namespace changes and cancel the old request', async () => {
    const reviewAccess = jest
      .fn<Promise<boolean>, Parameters<NonNullable<HostApiCoreServices['reviewAccess']>>>()
      .mockResolvedValueOnce(true);
    let finish: (allowed: boolean) => void = () => undefined;
    reviewAccess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result, rerender, unmount } = renderHook(
      ({ namespace }: { namespace: string }) => useAccessReviewState({ verb: 'get', namespace }),
      { initialProps: { namespace: 'a' }, wrapper: createWrapper(reviewAccess) },
    );
    await act(() => Promise.resolve());
    expect(result.current.state).toBe('allowed');
    rerender({ namespace: 'b' });
    expect(result.current.state).toBe('loading');
    expect(reviewAccess.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(() => Promise.resolve());
    unmount();
    expect(reviewAccess.mock.calls[1][1]?.signal?.aborted).toBe(true);
    await act(async () => finish(true));
  });
});
