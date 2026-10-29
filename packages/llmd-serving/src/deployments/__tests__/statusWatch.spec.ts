import { testHook } from '@odh-dashboard/jest-config/hooks';
import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import type { K8sAPIOptions, PodKind } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { useLLMInferenceServicePods } from '../status';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);
const opts: K8sAPIOptions = { dryRun: false };
const staleError = new Error('stale watch error');
const activeError = new Error('active watch error');

const pod = {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name: 'pod-1', namespace: 'test-project' },
} as PodKind;

describe('useLLMInferenceServicePods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable and re-enable the watch without leaking stale data or errors', () => {
    let watchResult: [PodKind[], boolean, Error | undefined] = [[pod], false, staleError];
    mockUseK8sWatchResourceList.mockImplementation(() => watchResult);

    const renderResult = testHook(useLLMInferenceServicePods)('test-project', opts, false);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(null, PodModel, opts);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[pod], false, activeError];
    renderResult.rerender('test-project', opts, true);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(
      expect.objectContaining({ namespace: 'test-project' }),
      PodModel,
      opts,
    );
    expect(renderResult.result.current).toStrictEqual(watchResult);

    watchResult = [[pod], true, undefined];
    renderResult.rerender('test-project', opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[], true, activeError];
    renderResult.rerender('test-project', opts, true);
    expect(renderResult.result.current).toStrictEqual(watchResult);

    renderResult.rerender('test-project', opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);
  });
});
