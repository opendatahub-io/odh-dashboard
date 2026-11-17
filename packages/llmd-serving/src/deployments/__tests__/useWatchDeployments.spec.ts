import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ProjectKind, PodKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import type {
  LLMdDeployment,
  LLMInferenceServiceConfigKind,
  LLMInferenceServiceKind,
} from '../../types';
import * as llmInferenceServiceApi from '../../api/LLMInferenceService';
import * as llmInferenceServiceConfigsApi from '../../api/LLMInferenceServiceConfigs';
import * as statusModule from '../status';
import { useWatchDeployments } from '../useWatchDeployments';

jest.mock('../../api/LLMInferenceService');
jest.mock('../../api/LLMInferenceServiceConfigs');
jest.mock('../status', () => ({
  ...jest.requireActual('../status'),
  useLLMInferenceServicePods: jest.fn(),
}));
jest.mock('@odh-dashboard/model-serving/shared/kueue/useKueueStatusWithQueuePositions', () => ({
  useKueueStatusWithQueuePositions: jest.fn(() => ({
    kueueStatusByDeploymentKey: {},
    isLoading: false,
  })),
}));

const mockUseWatchLLMInferenceService = jest.mocked(
  llmInferenceServiceApi.useWatchLLMInferenceService,
);
const mockUseWatchLLMInferenceServiceConfigs = jest.mocked(
  llmInferenceServiceConfigsApi.useWatchLLMInferenceServiceConfigs,
);
const mockUseLLMInferenceServicePods = jest.mocked(statusModule.useLLMInferenceServicePods);

type DeploymentHookResult = [LLMdDeployment[] | undefined, boolean, Error[] | undefined];

describe('useWatchDeployments', () => {
  let mockProject: ProjectKind;
  let mockLLMInferenceServices: LLMInferenceServiceKind[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockProject = mockProjectK8sResource({ k8sName: 'test-project' });
    mockLLMInferenceServices = [
      mockLLMInferenceServiceK8sResource({ name: 'model-1', namespace: 'test-project' }),
    ];

    mockUseWatchLLMInferenceService.mockReturnValue([mockLLMInferenceServices, true, undefined]);
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], true, undefined] as [
      LLMInferenceServiceConfigKind[],
      boolean,
      Error | undefined,
    ]);
    mockUseLLMInferenceServicePods.mockReturnValue([[], true, undefined] as [
      PodKind[],
      boolean,
      Error | undefined,
    ]);
  });

  it('should retain a finalizing deployment until the watch confirms it is gone', () => {
    mockLLMInferenceServices[0].metadata.deletionTimestamp = '2026-11-16T12:00:00Z';
    mockLLMInferenceServices[0].metadata.finalizers = ['serving.kserve.io/finalizer'];
    const hook = testHook(useWatchDeployments)(mockProject, undefined, undefined);
    expect(hook.result.current[0]).toHaveLength(1);
    expect(hook.result.current[0]?.[0].status?.state).toBe(ModelDeploymentState.DELETING);
    mockUseWatchLLMInferenceService.mockReturnValue([[], true, undefined]);
    hook.rerender(mockProject, undefined, undefined);
    expect(hook.result.current[0]).toEqual([]);
  });

  it('should skip secondary resource watches when no LLM inference services are returned', () => {
    mockUseWatchLLMInferenceService.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments, loaded, errors] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(0);
    expect(loaded).toBe(true);
    expect(errors).toHaveLength(0);
    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenCalledWith(
      'test-project',
      undefined,
      undefined,
      false,
    );
    expect(mockUseLLMInferenceServicePods).toHaveBeenCalledWith('test-project', undefined, false);
  });

  it('should enable secondary resource watches when LLM inference services are returned', () => {
    testHook(useWatchDeployments)(mockProject, undefined, undefined);

    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenCalledWith(
      'test-project',
      undefined,
      undefined,
      true,
    );
    expect(mockUseLLMInferenceServicePods).toHaveBeenCalledWith('test-project', undefined, true);
  });
});
