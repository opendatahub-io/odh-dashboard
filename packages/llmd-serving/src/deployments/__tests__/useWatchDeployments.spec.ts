import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { PodKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { resolveWorkloadClaims } from '@odh-dashboard/hardware-profiles/shared/dra/workloadClaims';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServicePodK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServicePodK8sResource';
import type { LLMInferenceServiceKind } from '../../types';
import {
  LLMD_MAIN_CONTAINER_NAME,
  LLMD_WORKLOAD_POD_COMPONENT,
  LLMD_WORKLOAD_POD_COMPONENTS,
} from '../constants';
import { getLLMdDeploymentStatus } from '../status';
import {
  LLMD_MODEL_CONTAINER_NAMES,
  selectLLMInferenceServicePods,
  selectLLMInferenceServiceStatusPods,
  useWatchDeployments,
} from '../useWatchDeployments';

jest.mock('../../api/LLMInferenceService', () => ({
  useWatchLLMInferenceService: jest.fn(),
}));
jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useWatchLLMInferenceServiceConfigs: jest.fn(),
}));
jest.mock('../status', () => ({
  ...jest.requireActual('../status'),
  useLLMInferenceServicePods: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/pages/modelServing/useKueueStatusWithQueuePositions', () => ({
  useKueueStatusWithQueuePositions: jest.fn(() => ({
    kueueStatusByDeploymentKey: {},
    isLoading: false,
    error: null,
  })),
}));

const mockUseWatchLLMInferenceService = jest.requireMock('../../api/LLMInferenceService')
  .useWatchLLMInferenceService as jest.Mock;
const mockUseWatchLLMInferenceServiceConfigs = jest.requireMock(
  '../../api/LLMInferenceServiceConfigs',
).useWatchLLMInferenceServiceConfigs as jest.Mock;
const mockUseLLMInferenceServicePods = jest.requireMock('../status')
  .useLLMInferenceServicePods as jest.Mock;
const mockUseKueueStatusWithQueuePositions = jest.requireMock(
  '@odh-dashboard/internal/pages/modelServing/useKueueStatusWithQueuePositions',
).useKueueStatusWithQueuePositions as jest.Mock;

const NAMESPACE = 'test-project';
const MODEL_A = 'model-a';
const MODEL_B = 'model-b';
const PREFILL_COMPONENT = 'llminferenceservice-workload-prefill';
const WORKER_COMPONENT = 'llminferenceservice-workload-worker';
const LEADER_COMPONENT = 'llminferenceservice-workload-leader';

const workerPod = (
  llmInferenceServiceName: string,
  name: string,
  options: Partial<Parameters<typeof mockLLMInferenceServicePodK8sResource>[0]> = {},
): PodKind =>
  mockLLMInferenceServicePodK8sResource({
    llmInferenceServiceName,
    name,
    namespace: NAMESPACE,
    ...options,
  });

describe('useWatchDeployments', () => {
  let project: ProjectKind;
  let llmInferenceServices: LLMInferenceServiceKind[];

  beforeEach(() => {
    jest.clearAllMocks();
    project = mockProjectK8sResource({ k8sName: NAMESPACE });
    llmInferenceServices = [
      mockLLMInferenceServiceK8sResource({ name: MODEL_A, namespace: NAMESPACE }),
      mockLLMInferenceServiceK8sResource({ name: MODEL_B, namespace: NAMESPACE }),
    ];
    mockUseWatchLLMInferenceService.mockReturnValue([llmInferenceServices, true, undefined]);
    mockUseWatchLLMInferenceServiceConfigs.mockReturnValue([[], true, undefined]);
    mockUseLLMInferenceServicePods.mockReturnValue([[], true, undefined]);
    mockUseKueueStatusWithQueuePositions.mockReturnValue({
      kueueStatusByDeploymentKey: {},
      isLoading: false,
      error: null,
    });
  });

  it('should build one llm-d deployment per LLMInferenceService', () => {
    const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

    const [deployments, loaded, errors] = renderResult.result.current;

    expect(deployments?.map((deployment) => deployment.model.metadata.name)).toEqual([
      MODEL_A,
      MODEL_B,
    ]);
    expect(deployments?.[0].modelServingPlatformId).toBe('llmd-serving');
    expect(loaded).toBe(true);
    expect(errors).toHaveLength(0);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should keep the same result reference on a rerender with identical inputs', () => {
    const pod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
    mockUseLLMInferenceServicePods.mockReturnValue([[pod], true, undefined]);
    const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

    renderResult.rerender(project, undefined, undefined);

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable();
  });

  it('should apply filterFn to the LLMInferenceServices', () => {
    const filterFn = (llmInferenceService: LLMInferenceServiceKind) =>
      llmInferenceService.metadata.name === MODEL_B;

    const renderResult = testHook(useWatchDeployments)(project, undefined, filterFn);

    const [deployments] = renderResult.result.current;
    expect(deployments?.map((deployment) => deployment.model.metadata.name)).toEqual([MODEL_B]);
    expect(mockUseKueueStatusWithQueuePositions).toHaveBeenCalledWith([], project, [
      llmInferenceServices[1],
    ]);
  });

  it('should pass labelSelectors and options to the watches', () => {
    const labelSelectors = { 'custom-label': 'value' };
    const opts = { dryRun: false };

    testHook(useWatchDeployments)(project, labelSelectors, undefined, opts);

    expect(mockUseWatchLLMInferenceService).toHaveBeenCalledWith(NAMESPACE, opts, labelSelectors);
    expect(mockUseWatchLLMInferenceServiceConfigs).toHaveBeenCalledWith(NAMESPACE, undefined, opts);
    expect(mockUseLLMInferenceServicePods).toHaveBeenCalledWith(NAMESPACE, opts);
  });

  describe('pods', () => {
    it('should attach an empty, loaded Pod list with the llm-d container name', () => {
      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].pods).toEqual({
        data: [],
        loaded: true,
        error: undefined,
        containerNames: LLMD_MODEL_CONTAINER_NAMES,
        podDescriptions: {},
      });
    });

    it('should attach the single worker Pod of a deployment', () => {
      const pod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
      mockUseLLMInferenceServicePods.mockReturnValue([[pod], true, undefined]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].pods?.data).toEqual([pod]);
      expect(deployments?.[1].pods?.data).toEqual([]);
    });

    it('should keep two workers of the same deployment as separate Pods', () => {
      const worker0 = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
      const worker1 = workerPod(MODEL_A, `${MODEL_A}-kserve-1`, { isPending: true });
      mockUseLLMInferenceServicePods.mockReturnValue([[worker1, worker0], true, undefined]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      // Watch order is preserved; nothing is merged or deduplicated.
      expect(deployments?.[0].pods?.data).toEqual([worker1, worker0]);
      expect(deployments?.[1].pods?.data).toEqual([]);
    });

    it('should attach prefill, leader, and worker Pods to their own deployment', () => {
      const decode = workerPod(MODEL_A, `${MODEL_A}-kserve-0`, { role: 'decode' });
      const prefill = workerPod(MODEL_A, `${MODEL_A}-kserve-prefill-0`, {
        component: PREFILL_COMPONENT,
        role: 'prefill',
      });
      const leader = workerPod(MODEL_B, `${MODEL_B}-kserve-0`, {
        component: LEADER_COMPONENT,
        role: 'both',
      });
      const worker = workerPod(MODEL_B, `${MODEL_B}-kserve-0-1`, { component: WORKER_COMPONENT });
      mockUseLLMInferenceServicePods.mockReturnValue([
        [worker, prefill, leader, decode],
        true,
        undefined,
      ]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].pods?.data).toEqual([prefill, decode]);
      expect(deployments?.[1].pods?.data).toEqual([worker, leader]);
      // Only the single-node decode Pod feeds the status, exactly as before the Claims row existed.
      expect(deployments?.[0].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[0], [decode], null),
      );
      expect(deployments?.[1].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[1], [], null),
      );
    });

    it('should exclude Pods that are not the deployment workload', () => {
      const ownPod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
      const otherModelPod = workerPod(MODEL_B, `${MODEL_B}-kserve-0`);
      const sameNameNotWorkload = mockPodK8sResource({
        name: `${MODEL_A}-router`,
        namespace: NAMESPACE,
        labels: { 'app.kubernetes.io/name': MODEL_A, 'app.kubernetes.io/component': 'router' },
      });
      const workloadWithoutName = mockPodK8sResource({
        name: 'orphan-workload',
        namespace: NAMESPACE,
        labels: { 'app.kubernetes.io/component': LLMD_WORKLOAD_POD_COMPONENT },
      });
      const unlabelledPod = mockPodK8sResource({ name: 'workbench-0', namespace: NAMESPACE });
      mockUseLLMInferenceServicePods.mockReturnValue([
        [unlabelledPod, otherModelPod, sameNameNotWorkload, ownPod, workloadWithoutName],
        true,
        undefined,
      ]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].pods?.data).toEqual([ownPod]);
      expect(deployments?.[1].pods?.data).toEqual([otherModelPod]);
    });

    it('should map the llm-d role label to a plain Pod description', () => {
      const prefill = workerPod(MODEL_A, `${MODEL_A}-kserve-prefill-0`, {
        component: PREFILL_COMPONENT,
        role: 'prefill',
      });
      const unlabelled = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
      const otherModel = workerPod(MODEL_B, `${MODEL_B}-kserve-0`, { role: 'both' });
      mockUseLLMInferenceServicePods.mockReturnValue([
        [prefill, unlabelled, otherModel],
        true,
        undefined,
      ]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].pods?.podDescriptions).toEqual({
        [`${MODEL_A}-kserve-prefill-0`]: 'prefill',
      });
      expect(deployments?.[1].pods?.podDescriptions).toEqual({ [`${MODEL_B}-kserve-0`]: 'both' });
      // Router state serializes deployments, so the Pods field must stay plain data.
      expect(() => structuredClone(deployments?.[0].pods)).not.toThrow();
    });

    it('should expose the Pod watch loading and error state on every deployment', () => {
      const podsError = new Error('Failed to fetch llm-d pods');
      mockUseLLMInferenceServicePods.mockReturnValue([[], false, podsError]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments, loaded, errors] = renderResult.result.current;

      expect(deployments?.map((deployment) => deployment.pods)).toEqual(
        Array(2).fill({
          data: [],
          loaded: false,
          error: podsError,
          containerNames: LLMD_MODEL_CONTAINER_NAMES,
          podDescriptions: {},
        }),
      );
      // A failed Pod watch still counts as settled for the table.
      expect(loaded).toBe(true);
      expect(errors).toEqual([podsError]);
    });

    it('should report loading while the Pod watch is pending without an error', () => {
      mockUseLLMInferenceServicePods.mockReturnValue([[], false, undefined]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments, loaded] = renderResult.result.current;

      expect(deployments?.[0].pods?.loaded).toBe(false);
      expect(loaded).toBe(false);
    });
  });

  describe('status', () => {
    it('should derive the status from the same Pods as before', () => {
      const pendingPod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`, { isPending: true });
      const otherPod = workerPod(MODEL_B, `${MODEL_B}-kserve-0`);
      mockUseLLMInferenceServicePods.mockReturnValue([[otherPod, pendingPod], true, undefined]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[0], [pendingPod], null),
      );
      expect(deployments?.[0].status?.state).toBe('FailedToLoad');
      expect(deployments?.[1].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[1], [otherPod], null),
      );
      expect(deployments?.[1].status?.state).toBe('Loaded');
    });

    it('should not let a pending worker or prefill Pod change the status', () => {
      const decode = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
      const pendingWorker = workerPod(MODEL_A, `${MODEL_A}-kserve-0-1`, {
        component: WORKER_COMPONENT,
        isPending: true,
      });
      const pendingPrefill = workerPod(MODEL_A, `${MODEL_A}-kserve-prefill-0`, {
        component: PREFILL_COMPONENT,
        isPending: true,
      });
      mockUseLLMInferenceServicePods.mockReturnValue([
        [pendingWorker, decode, pendingPrefill],
        true,
        undefined,
      ]);

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(deployments?.[0].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[0], [decode], null),
      );
      expect(deployments?.[0].status?.state).toBe('Loaded');
      expect(deployments?.[0].pods?.data).toEqual([pendingWorker, decode, pendingPrefill]);
    });

    it('should keep the Kueue status and conditions unchanged', () => {
      const kueueStatus = {
        status: KueueWorkloadStatus.Queued,
        message: 'Waiting for quota',
        timestamp: '2026-05-19T16:40:38Z',
      };
      mockUseKueueStatusWithQueuePositions.mockReturnValue({
        kueueStatusByDeploymentKey: { [`LLMInferenceService/${MODEL_A}`]: kueueStatus },
        isLoading: false,
        error: null,
      });

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [deployments] = renderResult.result.current;

      expect(mockUseKueueStatusWithQueuePositions).toHaveBeenCalledWith(
        [],
        project,
        llmInferenceServices,
      );
      expect(deployments?.[0].status).toEqual(
        getLLMdDeploymentStatus(llmInferenceServices[0], [], kueueStatus),
      );
      expect(deployments?.[0].status?.kueueStatus).toEqual(kueueStatus);
      expect(
        deployments?.[0].status?.conditions?.find((condition) => condition.type === 'CreatePod'),
      ).toBeDefined();
      expect(deployments?.[1].status?.kueueStatus).toBeNull();
    });

    it('should surface a Kueue watch error instead of dropping it', () => {
      mockUseKueueStatusWithQueuePositions.mockReturnValue({
        kueueStatusByDeploymentKey: {},
        isLoading: false,
        error: 'Forbidden',
      });

      const renderResult = testHook(useWatchDeployments)(project, undefined, undefined);

      const [, loaded, errors] = renderResult.result.current;

      expect(loaded).toBe(true);
      expect(errors?.map((error) => error.message)).toEqual(['Forbidden']);
    });
  });

  describe('Pod selectors', () => {
    const ownPod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`);
    const routerPod = mockPodK8sResource({
      name: `${MODEL_A}-router`,
      labels: { 'app.kubernetes.io/name': MODEL_A, 'app.kubernetes.io/component': 'router' },
    });
    const noLabels = mockPodK8sResource({ name: 'plain' });
    delete noLabels.metadata.labels;
    const shapes = LLMD_WORKLOAD_POD_COMPONENTS.map((component) =>
      workerPod(MODEL_A, `${MODEL_A}-${component}`, { component }),
    );

    it('should select every workload shape for Claims', () => {
      expect(selectLLMInferenceServicePods([routerPod, noLabels, ...shapes], MODEL_A)).toEqual(
        shapes,
      );
      expect(selectLLMInferenceServicePods(shapes, MODEL_B)).toEqual([]);
    });

    it('should select only the single-node component for the status', () => {
      expect(
        selectLLMInferenceServiceStatusPods([routerPod, noLabels, ...shapes, ownPod], MODEL_A),
      ).toEqual([shapes[0], ownPod]);
    });
  });

  describe('LLMD_MODEL_CONTAINER_NAMES', () => {
    it('should scope claim consumption to the main container through the shared resolver', () => {
      const claimName = 'pod-gpu-abc12';
      const requests = [
        { name: 'gpu-a', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } },
        { name: 'gpu-b', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } },
      ];
      const pod = workerPod(MODEL_A, `${MODEL_A}-kserve-0`, {
        resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: 'two-gpu' }],
        resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: claimName }],
        containerClaims: [{ name: 'gpu', request: 'gpu-a' }],
      });
      // A sidecar consumes the other request; it is not the model server.
      pod.spec.containers[1].resources = { claims: [{ name: 'gpu', request: 'gpu-b' }] };
      const lookups = {
        claims: {
          [claimName]: {
            status: 'loaded' as const,
            resource: mockResourceClaim({
              name: claimName,
              requests,
              allocationResults: [
                { request: 'gpu-a', driver: 'gpu.nvidia.com', pool: 'pool', device: 'gpu-0' },
                { request: 'gpu-b', driver: 'gpu.nvidia.com', pool: 'pool', device: 'gpu-1' },
              ],
            }),
          },
        },
        templates: {},
      };

      const scoped = resolveWorkloadClaims({ pod }, lookups, {
        containerNames: LLMD_MODEL_CONTAINER_NAMES,
      });
      const unscoped = resolveWorkloadClaims({ pod }, lookups);

      expect(pod.spec.containers[0].name).toBe(LLMD_MAIN_CONTAINER_NAME);
      const allocatedDevices = (state: (typeof scoped.claims)[0]['state']) =>
        state.status === 'allocated' ? state.devices.map((device) => device.result.device) : state;
      expect(allocatedDevices(scoped.claims[0].state)).toEqual(['gpu-0']);
      expect(allocatedDevices(unscoped.claims[0].state)).toEqual(['gpu-0', 'gpu-1']);
      // Every consumer stays visible on the reference regardless of scoping.
      expect(
        scoped.claims[0].reference.consumers.map((consumer) => consumer.containerName),
      ).toEqual([LLMD_MAIN_CONTAINER_NAME, 'kube-rbac-proxy']);
    });
  });
});
