import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import { K8sStatusError, useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { LLMInferenceServiceModel } from '../../types';
import { useDeploymentWatch } from '../useDeploymentWatch';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  useK8sWatchResource: jest.fn(),
}));

describe('useDeploymentWatch', () => {
  it('should relist and start a fresh watch after discovery is retried following a 403', async () => {
    jest.mocked(useK8sWatchResource).mockReturnValue([[], false, undefined]);
    const denied = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      code: 403,
      reason: 'Forbidden',
      message: 'Watch denied',
    });
    let discoveryAttempt = 0;
    const watchFetch = jest.fn(async (path: string, { signal }: RequestInit) => {
      if (new URL(path, 'https://kubernetes.test').searchParams.has('watch')) {
        if (discoveryAttempt === 0) {
          throw denied;
        }
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
      return {
        json: async () => ({ items: [], metadata: { resourceVersion: '10' } }),
      } as Response;
    });
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
      const core = React.useContext(HostApiCoreContext);
      const attempt = discoveryAttempt;
      const value = React.useMemo(
        () => ({
          ...core,
          deploymentApi: {
            group: LLMInferenceServiceModel.apiGroup,
            resource: LLMInferenceServiceModel.plural,
            resources: {},
            watchFetch,
            discoveryAttempt: attempt,
          },
        }),
        [core, attempt],
      );
      return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
    };

    const { result, rerender } = renderHook(
      () => useDeploymentWatch(LLMInferenceServiceModel, 'test-project'),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current).toEqual([[], false, denied]));
    expect(watchFetch).toHaveBeenCalledTimes(2);

    discoveryAttempt += 1;
    rerender();
    await waitFor(() => expect(watchFetch).toHaveBeenCalledTimes(4));
    expect(watchFetch.mock.calls[2][0]).toContain('limit=250');
    expect(watchFetch.mock.calls[3][0]).toContain('watch=true');
    expect(result.current).toEqual([[], true, undefined]);
  });

  it('should abort the old HTTP watch when the namespace changes and the active watch on unmount', async () => {
    const sdkWatch = jest.mocked(useK8sWatchResource).mockReturnValue([[], false, undefined]);
    const watchSignals = new Map<string, AbortSignal>();
    const watchFetch = async (path: string, { signal }: RequestInit): Promise<Response> => {
      const url = new URL(path, 'https://kubernetes.test');
      const namespace = url.pathname.split('/').at(-2) ?? '';
      if (url.searchParams.has('watch') && signal) {
        watchSignals.set(namespace, signal);
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
      return {
        json: async () => ({
          items: [{ metadata: { name: namespace, namespace } }],
          metadata: { resourceVersion: '10' },
        }),
      } as Response;
    };
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
      const core = React.useContext(HostApiCoreContext);
      const value = React.useMemo(
        () => ({
          ...core,
          deploymentApi: {
            group: LLMInferenceServiceModel.apiGroup,
            resource: LLMInferenceServiceModel.plural,
            resources: {},
            watchFetch,
          },
        }),
        [core],
      );
      return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
    };

    const { result, rerender, unmount } = renderHook(
      (namespace) => useDeploymentWatch(LLMInferenceServiceModel, namespace),
      { initialProps: 'first-project', wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(watchSignals.get('first-project')?.aborted).toBe(false);
      expect(result.current).toEqual([
        [{ metadata: { name: 'first-project', namespace: 'first-project' } }],
        true,
        undefined,
      ]);
    });

    rerender('second-project');
    expect(watchSignals.get('first-project')?.aborted).toBe(true);
    expect(result.current).toEqual([[], false, undefined]);
    await waitFor(() => {
      expect(watchSignals.get('second-project')?.aborted).toBe(false);
      expect(result.current).toEqual([
        [{ metadata: { name: 'second-project', namespace: 'second-project' } }],
        true,
        undefined,
      ]);
    });
    expect(sdkWatch).toHaveBeenLastCalledWith(null, LLMInferenceServiceModel, undefined);

    unmount();
    expect(watchSignals.get('second-project')?.aborted).toBe(true);
  });
});
