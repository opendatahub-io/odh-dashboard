import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sStatusError, type ProjectKind, type PodKind } from '@odh-dashboard/k8s-core';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
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
jest.mock('../status', () => {
  const actual = jest.requireActual<typeof import('../status')>('../status');
  return {
    ...actual,
    getLLMdDeploymentStatus: jest.fn(actual.getLLMdDeploymentStatus),
    useLLMInferenceServicePods: jest.fn(),
  };
});
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

const servingPod = (name: string, component: string, model = 'model-1'): PodKind =>
  mockPodK8sResource({
    name,
    labels: {
      'app.kubernetes.io/name': model,
      'app.kubernetes.io/component': component,
      'app.kubernetes.io/part-of': 'llminferenceservice',
    },
  });

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

  it.each([
    { scenario: 'no baseRefs', baseRefs: undefined, configExists: true, resolves: false },
    {
      scenario: 'non-matching baseRefs',
      baseRefs: [{ name: 'other-config' }],
      configExists: true,
      resolves: false,
    },
    {
      scenario: 'a missing config',
      baseRefs: [{ name: 'model-1' }],
      configExists: false,
      resolves: false,
    },
    {
      scenario: 'a matching baseRef and config',
      baseRefs: [{ name: 'model-1' }],
      configExists: true,
      resolves: true,
    },
  ])(
    'should resolve the deployment config with $scenario',
    ({ baseRefs, configExists, resolves }) => {
      const model = mockLLMInferenceServiceK8sResource({ name: 'model-1', baseRefs });
      const config = mockLLMInferenceServiceConfigK8sResource({
        name: 'model-1',
        namespace: 'test-project',
      });
      mockUseWatchLLMInferenceService.mockReturnValue([[model], true, undefined]);
      mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([
        configExists ? [config] : [],
        true,
        undefined,
      ]);

      const renderResult = testHook(useWatchDeployments)(mockProject);
      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].server).toEqual(resolves ? config : undefined);
      expect(renderResult).hookToHaveUpdateCount(1);
    },
  );

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

  it('should expose all matching Pod roles without changing the ordered status input', () => {
    const scheduler = servingPod('scheduler', 'llminferenceservice-router-scheduler');
    const leader = servingPod('leader', 'llminferenceservice-workload-leader');
    const worker = servingPod('worker', 'llminferenceservice-workload-worker');
    const prefill = servingPod('prefill', 'llminferenceservice-workload-prefill');
    const workloadA = servingPod('workload-a', 'llminferenceservice-workload');
    const workloadB = servingPod('workload-b', 'llminferenceservice-workload');
    const otherModel = servingPod('other-worker', 'llminferenceservice-workload-worker', 'model-2');
    const unlabeled = mockPodK8sResource({ name: 'unlabeled' });
    const modelPods = [scheduler, leader, worker, prefill, workloadA, workloadB];
    const statusSpy = jest.mocked(statusModule.getLLMdDeploymentStatus);
    mockUseLLMInferenceServicePods.mockReturnValue([
      [otherModel, ...modelPods, unlabeled],
      true,
      undefined,
    ]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);
    expect(renderResult.result.current[0]?.[0]).toHaveProperty('podDiscovery.pods', modelPods);
    expect(statusSpy).toHaveBeenLastCalledWith(
      mockLLMInferenceServices[0],
      [workloadA, workloadB],
      null,
    );

    const reorderedPods = [scheduler, leader, worker, prefill, workloadB, workloadA];
    mockUseLLMInferenceServicePods.mockReturnValue([reorderedPods, true, undefined]);
    renderResult.rerender(mockProject, undefined, undefined);
    expect(renderResult.result.current[0]?.[0]).toHaveProperty('podDiscovery.pods', reorderedPods);
    expect(statusSpy).toHaveBeenLastCalledWith(
      mockLLMInferenceServices[0],
      [workloadB, workloadA],
      null,
    );
  });

  it('should preserve a failed Pod watch separately from a successfully loaded empty list', () => {
    const error = new Error('Pod watch failed');
    mockUseLLMInferenceServicePods.mockReturnValue([[], false, error]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);
    const [deployments, loaded, errors] = renderResult.result.current;

    expect(deployments?.[0]).toHaveProperty('podDiscovery', { pods: [], loaded: false, error });
    expect(loaded).toBe(true);
    expect(errors).toEqual([error]);

    mockUseLLMInferenceServicePods.mockReturnValue([[], true, undefined]);
    renderResult.rerender(mockProject, undefined, undefined);
    expect(renderResult.result.current[0]?.[0]).toHaveProperty('podDiscovery', {
      pods: [],
      loaded: true,
      error: undefined,
    });
  });

  it('should keep the deployments when an optional details read is denied', () => {
    const forbidden = new K8sStatusError(mock403Error({}));
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, forbidden] as [
      LLMInferenceServiceConfigKind[],
      boolean,
      Error | undefined,
    ]);
    mockUseLLMInferenceServicePods.mockReturnValue([[], false, forbidden] as [
      PodKind[],
      boolean,
      Error | undefined,
    ]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);
    const [deployments, loaded, errors] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(1);
    expect(loaded).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should report other optional read failures and any model watch failure', () => {
    const unavailable = new K8sStatusError({ ...mock403Error({}), code: 503, message: 'down' });
    const forbidden = new K8sStatusError(mock403Error({}));
    mockUseWatchLLMInferenceService.mockReturnValue([[], false, forbidden]);
    mockUseLLMInferenceServicePods.mockReturnValue([[], false, unavailable] as [
      PodKind[],
      boolean,
      Error | undefined,
    ]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);
    const [, , errors] = renderResult.result.current as DeploymentHookResult;

    expect(errors).toEqual([forbidden, unavailable]);
  });
});
