import React, { act } from 'react';
import { waitFor } from '@testing-library/react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiCoreServices } from '../../types';
import { HostApiCoreContext } from '../../HostApiCoreContext';
import { useAccessReview } from '../useAccessReview';

function createWrapper(
  checkAccess: HostApiCoreServices['checkAccess'],
): React.FC<{ children: React.ReactNode }> {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const core = React.useContext(HostApiCoreContext);
    return React.createElement(
      HostApiCoreContext.Provider,
      { value: { ...core, checkAccess } },
      children,
    );
  };
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

const pendingReview = () => {
  const resolve = jest.fn<void, [boolean]>();
  const reject = jest.fn<void, [Error]>();
  const promise = new Promise<boolean>((resolvePromise, rejectPromise) => {
    resolve.mockImplementation(resolvePromise);
    reject.mockImplementation(rejectPromise);
  });
  return { promise, resolve, reject };
};

const attributes: Required<AccessReviewResourceAttributes> = {
  group: 'serving.kserve.io',
  resource: 'llminferenceservices',
  subresource: '',
  verb: 'delete',
  name: 'model',
  namespace: 'first-project',
};

describe('useAccessReview request isolation', () => {
  it.each<Partial<AccessReviewResourceAttributes>>([
    { group: 'example.io' },
    { resource: 'inferenceservices' },
    { subresource: 'status' },
    { verb: 'patch' },
    { name: 'other-model' },
    { namespace: 'second-project' },
  ])('should immediately revoke an earlier grant when attributes change: %j', async (change) => {
    const next = pendingReview();
    const checkAccess = jest.fn().mockResolvedValueOnce(true).mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook((attrs) => useAccessReview(attrs), {
      initialProps: attributes,
      wrapper: createWrapper(checkAccess),
    });
    await waitFor(() => expect(result.current).toEqual([true, true]));

    const changed = { ...attributes, ...change };
    rerender(changed);
    expect(result.current).toEqual([false, false]);
    expect(checkAccess).toHaveBeenLastCalledWith(changed);

    await act(async () => next.resolve(false));
    expect(result.current).toEqual([false, true]);
  });

  it('should ignore an old approval that arrives after the current denial', async () => {
    const first = pendingReview();
    const checkAccess = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(false);
    const { result, rerender } = renderHook((attrs) => useAccessReview(attrs), {
      initialProps: attributes,
      wrapper: createWrapper(checkAccess),
    });
    rerender({ ...attributes, namespace: 'second-project' });
    await waitFor(() => expect(result.current).toEqual([false, true]));

    await act(async () => first.resolve(true));
    expect(result.current).toEqual([false, true]);
  });

  it('should ignore an old rejection after the current approval', async () => {
    const first = pendingReview();
    const checkAccess = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(true);
    const { result, rerender } = renderHook((attrs) => useAccessReview(attrs), {
      initialProps: attributes,
      wrapper: createWrapper(checkAccess),
    });
    rerender({ ...attributes, name: 'other-model' });
    await waitFor(() => expect(result.current).toEqual([true, true]));

    await act(async () => first.reject(new Error('Old request failed')));
    expect(result.current).toEqual([true, true]);
  });

  it('should review again when returning to a previously approved resource', async () => {
    const last = pendingReview();
    const checkAccess = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(last.promise);
    const { result, rerender } = renderHook((attrs) => useAccessReview(attrs), {
      initialProps: attributes,
      wrapper: createWrapper(checkAccess),
    });
    await waitFor(() => expect(result.current).toEqual([true, true]));
    rerender({ ...attributes, namespace: 'second-project' });
    await waitFor(() => expect(result.current).toEqual([false, true]));
    rerender(attributes);

    expect(result.current).toEqual([false, false]);
    expect(checkAccess).toHaveBeenCalledTimes(3);
    await act(async () => last.resolve(false));
    expect(result.current).toEqual([false, true]);
  });

  it('should revoke access when disabled and recheck when enabled again', async () => {
    const next = pendingReview();
    const checkAccess = jest.fn().mockResolvedValueOnce(true).mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook((enabled) => useAccessReview(attributes, enabled), {
      initialProps: true,
      wrapper: createWrapper(checkAccess),
    });
    await waitFor(() => expect(result.current).toEqual([true, true]));
    rerender(false);
    expect(result.current).toEqual([false, false]);
    expect(checkAccess).toHaveBeenCalledTimes(1);
    rerender(true);
    expect(result.current).toEqual([false, false]);
    await act(async () => next.resolve(false));
    expect(result.current).toEqual([false, true]);
  });

  it('should ignore a pending approval after disabling the check', async () => {
    const pending = pendingReview();
    const checkAccess = jest.fn(() => pending.promise);
    const { result, rerender } = renderHook((enabled) => useAccessReview(attributes, enabled), {
      initialProps: true,
      wrapper: createWrapper(checkAccess),
    });
    rerender(false);
    await act(async () => pending.resolve(true));
    expect(result.current).toEqual([false, false]);
  });

  it('should discard the previous host service approval when the host service changes', async () => {
    const previous = pendingReview();
    const current = pendingReview();
    let checkAccess = jest.fn(() => previous.promise);
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
      const core = React.useContext(HostApiCoreContext);
      return React.createElement(
        HostApiCoreContext.Provider,
        { value: { ...core, checkAccess } },
        children,
      );
    };
    const { result, rerender } = renderHook(() => useAccessReview(attributes), {
      wrapper: Wrapper,
    });
    checkAccess = jest.fn(() => current.promise);
    rerender();
    await act(async () => previous.resolve(true));
    expect(result.current).toEqual([false, false]);
    await act(async () => current.resolve(false));
    expect(result.current).toEqual([false, true]);
  });

  it('should not repeat reviews for equivalent attributes', async () => {
    const checkAccess = jest.fn().mockResolvedValue(true);
    const renderResult = renderHook((attrs) => useAccessReview(attrs), {
      initialProps: attributes,
      wrapper: createWrapper(checkAccess),
    });
    const { result, rerender } = renderResult;
    expect(renderResult).hookToHaveUpdateCount(1);
    await waitFor(() => expect(result.current).toEqual([true, true]));
    expect(renderResult).hookToHaveUpdateCount(2);
    rerender({ ...attributes });
    expect(result.current).toEqual([true, true]);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(checkAccess).toHaveBeenCalledTimes(1);
  });

  it('should ignore the first StrictMode effect after its cleanup', async () => {
    const first = pendingReview();
    const second = pendingReview();
    const checkAccess = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const Provider = createWrapper(checkAccess);
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
      React.createElement(React.StrictMode, null, React.createElement(Provider, null, children));
    const { result } = renderHook(() => useAccessReview(attributes), { wrapper: Wrapper });

    await act(async () => first.resolve(true));
    expect(result.current).toEqual([false, false]);
    await act(async () => second.resolve(false));
    expect(result.current).toEqual([false, true]);
  });
});

describe('useAccessReview failure handling', () => {
  it('should deny a rejected review and finish loading', async () => {
    const checkAccess = jest.fn().mockRejectedValue(new Error('Forbidden'));
    const { result } = renderHook(() => useAccessReview(attributes), {
      wrapper: createWrapper(checkAccess),
    });
    await waitFor(() => expect(result.current).toEqual([false, true]));
  });

  it('should deny a synchronously throwing host service', async () => {
    const checkAccess = jest.fn(() => {
      throw new Error('Host service unavailable');
    });
    const { result } = renderHook(() => useAccessReview(attributes), {
      wrapper: createWrapper(checkAccess),
    });
    await waitFor(() => expect(result.current).toEqual([false, true]));
  });

  it('should deny when no host provider is mounted', async () => {
    const { result } = renderHook(() => useAccessReview(attributes));
    await waitFor(() => expect(result.current).toEqual([false, true]));
  });
});
