import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ProjectKind, PodKind } from '@odh-dashboard/k8s-core';
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
});
