import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { LLMInferenceServiceModel } from '../../types';
import { useDeploymentWatch } from '../useDeploymentWatch';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  useK8sWatchResource: jest.fn(),
}));

describe('useDeploymentWatch', () => {
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
