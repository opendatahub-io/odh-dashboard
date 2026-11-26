import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import type { ProjectKind, PodKind } from '@odh-dashboard/k8s-core';
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

const withDeploymentApi = (checkAccess: jest.Mock, hasConfigApi: boolean) => {
  const deploymentApi = {
    group: 'serving.kserve.io',
    resource: 'llminferenceservices',
    resources: {
      llminferenceservices: ['list', 'watch'],
      ...(hasConfigApi ? { llminferenceserviceconfigs: ['list', 'watch'] } : {}),
    },
  };
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const core = React.useContext(HostApiCoreContext);
    const value = React.useMemo(() => ({ ...core, checkAccess, deploymentApi }), [core]);
    return React.createElement(HostApiCoreContext.Provider, { value }, children);
  };
  return Wrapper;
};

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

  it('should keep read-only models visible when config discovery is missing and pod access is denied', async () => {
    const checkAccess = jest.fn().mockResolvedValue(false);
    const { result, rerender } = renderHook(() => useWatchDeployments(mockProject), {
      wrapper: withDeploymentApi(checkAccess, false),
    });
    await waitFor(() =>
      expect(result.current[0]?.[0].podDiscovery?.error?.message).toContain('Cannot watch pods'),
    );
    expect(result.current[1]).toBe(true);
    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenLastCalledWith(
      'test-project',
      undefined,
      undefined,
      false,
    );
    expect(mockUseLLMInferenceServicePods).toHaveBeenLastCalledWith(
      'test-project',
      undefined,
      false,
    );
    rerender();
    expect(checkAccess).toHaveBeenCalledTimes(2);
    expect(checkAccess.mock.calls.map(([attrs]) => [attrs.resource, attrs.verb])).toEqual([
      ['pods', 'list'],
      ['pods', 'watch'],
    ]);
  });

  it('should keep models loaded when optional watches start or fail after access is granted', async () => {
    const checkAccess = jest.fn().mockResolvedValue(true);
    mockUseWatchLLMInferenceServiceConfigs.mockImplementation((_ns, _labels, _options, enabled) => [
      [],
      !enabled,
      undefined,
    ]);
    mockUseLLMInferenceServicePods.mockImplementation((_ns, _options, enabled) => [
      [],
      !enabled,
      undefined,
    ]);
    const { result, rerender } = renderHook(() => useWatchDeployments(mockProject), {
      wrapper: withDeploymentApi(checkAccess, true),
    });

    expect(result.current[1]).toBe(true);
    await waitFor(() =>
      expect(mockUseLLMInferenceServicePods).toHaveBeenLastCalledWith(
        'test-project',
        undefined,
        true,
      ),
    );
    expect(result.current[1]).toBe(true);
    expect(result.current[0]?.[0].podDiscovery?.loaded).toBe(false);

    const podsError = new Error('Pod access revoked');
    mockUseLLMInferenceServicePods.mockReturnValue([[], false, podsError]);
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], false, new Error('Config error')]);
    rerender();
    expect(result.current[1]).toBe(true);
    expect(result.current[0]?.[0].podDiscovery?.error).toBe(podsError);
    expect(result.current[2]).toEqual([]);
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
});
