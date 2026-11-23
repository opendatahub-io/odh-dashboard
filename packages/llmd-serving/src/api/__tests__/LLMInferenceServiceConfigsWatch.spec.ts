import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../../types';
import { useWatchLLMInferenceServiceConfigs } from '../LLMInferenceServiceConfigs';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);
const opts: K8sAPIOptions = { dryRun: false };
const staleError = new Error('stale watch error');
const activeError = new Error('active watch error');

const mockConfig = {
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'LLMInferenceServiceConfig',
  metadata: { name: 'config-1', namespace: 'test-project' },
} as LLMInferenceServiceConfigKind;

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
