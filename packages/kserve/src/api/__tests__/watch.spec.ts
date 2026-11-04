import { testHook } from '@odh-dashboard/jest-config/hooks';
import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import type { K8sAPIOptions, PodKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { ServingRuntimeModel } from '@odh-dashboard/internal/api/models/kserve';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { useWatchDeploymentPods, useWatchServingRuntimes } from '../watch';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);
const mockProject = mockProjectK8sResource({ k8sName: 'test-project' });
const opts: K8sAPIOptions = { dryRun: false };

const staleError = new Error('stale watch error');
const activeError = new Error('active watch error');

describe('KServe deployment secondary watches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable and re-enable serving runtime watch without leaking stale data or errors', () => {
    const servingRuntime = mockServingRuntimeK8sResource({
      name: 'runtime-1',
      namespace: 'test-project',
    });
    let watchResult: CustomWatchK8sResult<ServingRuntimeKind[]> = [
      [servingRuntime],
      false,
      staleError,
    ];
    mockUseK8sWatchResourceList.mockImplementation(() => watchResult);

    const renderResult = testHook(useWatchServingRuntimes)(mockProject, opts, false);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(null, ServingRuntimeModel, opts);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[servingRuntime], false, activeError];
    renderResult.rerender(mockProject, opts, true);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(
      expect.objectContaining({ namespace: 'test-project' }),
      ServingRuntimeModel,
      opts,
    );
    expect(renderResult.result.current).toStrictEqual(watchResult);

    watchResult = [[servingRuntime], true, undefined];
    renderResult.rerender(mockProject, opts, false);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(null, ServingRuntimeModel, opts);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[], true, activeError];
    renderResult.rerender(mockProject, opts, true);
    expect(renderResult.result.current).toStrictEqual(watchResult);

    renderResult.rerender(mockProject, opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);
  });

  it('should disable and re-enable deployment pod watch without leaking stale data or errors', () => {
    const pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: 'pod-1', namespace: 'test-project' },
    } as PodKind;
    let watchResult: CustomWatchK8sResult<PodKind[]> = [[pod], false, staleError];
    mockUseK8sWatchResourceList.mockImplementation(() => watchResult);

    const renderResult = testHook(useWatchDeploymentPods)(mockProject, opts, false);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(null, PodModel, opts);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[pod], false, activeError];
    renderResult.rerender(mockProject, opts, true);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(
      expect.objectContaining({ namespace: 'test-project' }),
      PodModel,
      opts,
    );
    expect(renderResult.result.current).toStrictEqual(watchResult);

    watchResult = [[pod], true, undefined];
    renderResult.rerender(mockProject, opts, false);

    expect(mockUseK8sWatchResourceList).toHaveBeenLastCalledWith(null, PodModel, opts);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);

    watchResult = [[], true, activeError];
    renderResult.rerender(mockProject, opts, true);
    expect(renderResult.result.current).toStrictEqual(watchResult);

    renderResult.rerender(mockProject, opts, false);
    expect(renderResult.result.current).toStrictEqual([[], true, undefined]);
  });
});
