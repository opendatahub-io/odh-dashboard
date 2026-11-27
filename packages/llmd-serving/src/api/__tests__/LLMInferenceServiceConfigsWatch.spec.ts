import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../../types';
import {
  useFetchLLMInferenceServiceConfigs,
  useWatchLLMInferenceServiceConfigs,
} from '../LLMInferenceServiceConfigs';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sListResourceItems: jest.fn(),
}));

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);
const opts: K8sAPIOptions = { dryRun: false };
const staleError = new Error('stale watch error');
const activeError = new Error('active watch error');
const mockConfig = {
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'LLMInferenceServiceConfig',
  metadata: { name: 'config-1', namespace: 'test-project' },
} as LLMInferenceServiceConfigKind;

describe('dashboard config list for deployment details', () => {
  it.each([
    { served: false, allowed: true, error: 'does not serve' },
    { served: true, allowed: false, error: 'Access denied' },
    {
      served: true,
      allowed: false,
      error: 'Kubernetes access review timed out.',
      accessError: new DOMException('Kubernetes access review timed out.', 'TimeoutError'),
    },
    { served: true, allowed: true, error: undefined },
  ])(
    'checks discovery ($served) and list access ($allowed, error: $error)',
    async ({ served, allowed, error, accessError }) => {
      const checkAccess = jest.fn().mockResolvedValue(allowed);
      if (accessError) {
        checkAccess.mockRejectedValue(accessError);
      }
      const list = jest.mocked(k8sListResourceItems).mockClear().mockResolvedValue([mockConfig]);
      const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
        const core = React.useContext(HostApiCoreContext);
        const value = React.useMemo(
          () => ({
            ...core,
            checkAccess,
            deploymentApi: {
              group: 'serving.kserve.io',
              resource: 'llminferenceservices',
              resources: { llminferenceserviceconfigs: served ? ['list'] : [] },
            },
          }),
          [core],
        );
        return React.createElement(HostApiCoreContext.Provider, { value }, children);
      };
      const { result } = renderHook(() => useFetchLLMInferenceServiceConfigs('dashboard-ns'), {
        wrapper: Wrapper,
      });
      if (error) {
        await waitFor(() => expect(result.current.error?.message).toContain(error));
        expect(list).not.toHaveBeenCalled();
      } else {
        await waitFor(() => expect(result.current.data).toEqual([mockConfig]));
        expect(list).toHaveBeenCalledTimes(1);
      }
      if (served) {
        expect(checkAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            group: 'serving.kserve.io',
            resource: 'llminferenceserviceconfigs',
            verb: 'list',
            namespace: 'dashboard-ns',
          }),
        );
      } else {
        expect(checkAccess).not.toHaveBeenCalled();
      }
    },
  );
});

describe('useWatchLLMInferenceServiceConfigs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable and re-enable the watch without leaking stale data or errors', () => {
    let watchResult: [LLMInferenceServiceConfigKind[], boolean, Error | undefined] = [
      [mockConfig],
      false,
      staleError,
    ];
    mockUseK8sWatchResourceList.mockImplementation(() => watchResult);

    const renderResult = testHook(useWatchLLMInferenceServiceConfigs)(
      'test-project',
      undefined,
      opts,
      false,
    );

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(
      null,
      LLMInferenceServiceConfigModel,
      opts,
    );
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[mockConfig], false, activeError];
    renderResult.rerender('test-project', undefined, opts, true);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(
      expect.objectContaining({ namespace: 'test-project' }),
      LLMInferenceServiceConfigModel,
      opts,
    );
    expect(renderResult.result.current).toStrictEqual(watchResult);

    watchResult = [[mockConfig], true, undefined];
    renderResult.rerender('test-project', undefined, opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[], true, activeError];
    renderResult.rerender('test-project', undefined, opts, true);
    expect(renderResult.result.current).toStrictEqual(watchResult);

    renderResult.rerender('test-project', undefined, opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);
  });
});
