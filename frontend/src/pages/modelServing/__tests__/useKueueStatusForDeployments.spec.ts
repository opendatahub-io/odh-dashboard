import { renderHook } from '@testing-library/react';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import type { WorkloadKind } from '#~/k8sTypes';
import { WorkloadStatusType } from '#~/concepts/distributedWorkloads/utils';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import {
  buildWorkloadMapForDeployments,
  useWatchWorkloads,
  useWatchISPods,
  useWatchLLMISPods,
} from '#~/api/k8s/workloads';
import { useKueueStatusForDeployments } from '#~/pages/modelServing/useKueueStatusForDeployments';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils');
jest.mock('#~/api/k8s/workloads', () => ({
  ...jest.requireActual('#~/api/k8s/workloads'),
  useWatchWorkloads: jest.fn(),
  useWatchISPods: jest.fn(),
  useWatchLLMISPods: jest.fn(),
  buildWorkloadMapForDeployments: jest.fn(),
}));
jest.mock('#~/concepts/kueue/index', () => ({
  ...jest.requireActual('#~/concepts/kueue/index'),
  KUEUE_QUEUE_LABEL: 'kueue.x-k8s.io/queue-name',
}));

const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useWatchWorkloadsMock = jest.mocked(useWatchWorkloads);
const useWatchISPodsMock = jest.mocked(useWatchISPods);
const useWatchLLMISPodsMock = jest.mocked(useWatchLLMISPods);
const buildWorkloadMapForDeploymentsMock = jest.mocked(buildWorkloadMapForDeployments);

const NS = 'test-ns';
const POD_UID = 'pod-uid-abc123';
const project = mockProjectK8sResource({ k8sName: NS, enableKueue: true });

const mockKueueEnabled = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
};

const inferenceService = (name: string): InferenceServiceKind =>
  mockInferenceServiceK8sResource({ name, namespace: NS });

function isPod(isName: string, uid = POD_UID): PodKind {
  const pod = mockPodK8sResource({
    name: `model-predictor-${uid.slice(0, 8)}`,
    namespace: NS,
    labels: { 'serving.kserve.io/inferenceservice': isName },
  });
  return { ...pod, metadata: { ...pod.metadata, uid } };
}

function llmisPod(llmisName: string, uid: string): PodKind {
  const pod = mockPodK8sResource({
    name: `llm-predictor-${uid.slice(0, 8)}`,
    namespace: NS,
    labels: {
      'app.kubernetes.io/component': 'llminferenceservice-workload',
      'app.kubernetes.io/name': llmisName,
    },
  });
  return { ...pod, metadata: { ...pod.metadata, uid } };
}

function workloadWithPodOwnerRef(
  workloadName: string,
  podUid: string,
  status = WorkloadStatusType.Running,
): WorkloadKind {
  const wl = mockWorkloadK8sResource({ k8sName: workloadName, namespace: NS, mockStatus: status });
  return {
    ...wl,
    metadata: {
      ...wl.metadata,
      ownerReferences: [
        {
          apiVersion: 'v1',
          kind: 'Pod',
          name: `model-predictor-${podUid.slice(0, 8)}`,
          uid: podUid,
        },
      ],
    },
  };
}

describe('useKueueStatusForDeployments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKueueConfigurationMock.mockReturnValue(mockKueueEnabled);
    useWatchWorkloadsMock.mockReturnValue([[], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[], true, undefined]);
    useWatchLLMISPodsMock.mockReturnValue([[], true, undefined]);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({});
  });

  it('returns empty status and no loading when Kueue is disabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      isKueueDisabled: true,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: false,
      kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
    });
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.kueueStatusByDeploymentKey).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passes project namespace to all three watches when Kueue is active', () => {
    renderHook(() => useKueueStatusForDeployments([inferenceService('my-model')], project));
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(NS);
    expect(useWatchISPodsMock).toHaveBeenCalledWith(NS);
    expect(useWatchLLMISPodsMock).toHaveBeenCalledWith(NS);
  });

  it('passes undefined namespace to all three watches when project is undefined', () => {
    renderHook(() => useKueueStatusForDeployments([inferenceService('my-model')], undefined));
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
    expect(useWatchISPodsMock).toHaveBeenCalledWith(undefined);
    expect(useWatchLLMISPodsMock).toHaveBeenCalledWith(undefined);
  });

  it('passes combined IS+LLMIS pods and llmInferenceServices to buildWorkloadMapForDeployments', () => {
    const is = inferenceService('my-model');
    const llmis = { metadata: { name: 'my-llm' } };
    const isPodResource = isPod('my-model', 'uid-is');
    const llmisPodResource = llmisPod('my-llm', 'uid-llmis');
    const workloads = [workloadWithPodOwnerRef('wl-1', 'uid-is')];

    useWatchWorkloadsMock.mockReturnValue([workloads, true, undefined]);
    useWatchISPodsMock.mockReturnValue([[isPodResource], true, undefined]);
    useWatchLLMISPodsMock.mockReturnValue([[llmisPodResource], true, undefined]);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'InferenceService/my-model': [],
      'LLMInferenceService/my-llm': [],
    });

    renderHook(() => useKueueStatusForDeployments([is], project, [llmis]));

    expect(buildWorkloadMapForDeploymentsMock).toHaveBeenCalledWith(
      workloads,
      [isPodResource, llmisPodResource],
      [is],
      [llmis],
    );
  });

  it('is loading while workloads watch is pending', () => {
    useWatchWorkloadsMock.mockReturnValue([[], false, undefined]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('is loading while IS pods watch is pending', () => {
    useWatchISPodsMock.mockReturnValue([[], false, undefined]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('is loading while LLMIS pods watch is pending', () => {
    useWatchLLMISPodsMock.mockReturnValue([[], false, undefined]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('returns workload watch error when present', () => {
    const err = new Error('workload watch failed');
    useWatchWorkloadsMock.mockReturnValue([[], true, err]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.error).toBe('workload watch failed');
  });

  it('returns IS pods watch error when workload watch is healthy', () => {
    const err = new Error('IS pod watch failed');
    useWatchISPodsMock.mockReturnValue([[], true, err]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.error).toBe('IS pod watch failed');
  });

  it('returns LLMIS pods watch error when both other watches are healthy', () => {
    const err = new Error('LLMIS pod watch failed');
    useWatchLLMISPodsMock.mockReturnValue([[], true, err]);
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.error).toBe('LLMIS pod watch failed');
  });

  it('returns null status when workload map has no entry for an IS', () => {
    buildWorkloadMapForDeploymentsMock.mockReturnValue({ 'InferenceService/my-model': [] });
    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/my-model']).toBeNull();
  });

  it('returns aggregated status when workload map has entries', () => {
    const uid = POD_UID;
    const pod = isPod('my-model', uid);
    const wl = workloadWithPodOwnerRef('wl-1', uid, WorkloadStatusType.Inadmissible);
    useWatchISPodsMock.mockReturnValue([[pod], true, undefined]);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({ 'InferenceService/my-model': [wl] });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/my-model']?.status).toBe(
      KueueWorkloadStatus.Inadmissible,
    );
  });

  it('returns null when no Workload CR exists yet, even if the IS has a queueName label (e.g. stopped deployments keep the label)', () => {
    // Mirrors workbench: no Workload CR → null, regardless of queueName label presence. The
    // label alone can't distinguish "not yet admitted" from "stopped" (the label persists on
    // the IS even while stopped), so we don't guess a "Queued" status from it.
    const is = {
      ...inferenceService('test-model'),
      metadata: {
        ...inferenceService('test-model').metadata,
        labels: { 'kueue.x-k8s.io/queue-name': 'default' },
        annotations: { 'serving.kserve.io/stop': 'true' },
      },
    };
    buildWorkloadMapForDeploymentsMock.mockReturnValue({ 'InferenceService/test-model': [] });

    const { result } = renderHook(() => useKueueStatusForDeployments([is], project));
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/test-model']).toBeNull();
  });

  it('includes queueName from IS label in the status', () => {
    const is = {
      ...inferenceService('my-model'),
      metadata: {
        ...inferenceService('my-model').metadata,
        labels: { 'kueue.x-k8s.io/queue-name': 'team-queue' },
      },
    };
    const wl = workloadWithPodOwnerRef('wl-1', POD_UID);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({ 'InferenceService/my-model': [wl] });

    const { result } = renderHook(() => useKueueStatusForDeployments([is], project));
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/my-model']?.queueName).toBe(
      'team-queue',
    );
  });

  it('includes queueName from LLMIS label in the status (not just plain InferenceServices)', () => {
    const llmis = {
      metadata: {
        name: 'my-llm-model',
        labels: { 'kueue.x-k8s.io/queue-name': 'llm-team-queue' },
      },
    };
    const wl = workloadWithPodOwnerRef('wl-1', POD_UID);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'LLMInferenceService/my-llm-model': [wl],
    });

    const { result } = renderHook(() => useKueueStatusForDeployments([], project, [llmis]));
    expect(
      result.current.kueueStatusByDeploymentKey['LLMInferenceService/my-llm-model']?.queueName,
    ).toBe('llm-team-queue');
  });

  it('multi-replica: most-restrictive status wins (Inadmissible beats Running)', () => {
    const uid0 = 'uid-0';
    const uid1 = 'uid-1';
    const wlRunning = workloadWithPodOwnerRef('wl-running', uid0, WorkloadStatusType.Running);
    const wlInadmissible = workloadWithPodOwnerRef(
      'wl-inadmissible',
      uid1,
      WorkloadStatusType.Inadmissible,
    );
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'InferenceService/my-model': [wlRunning, wlInadmissible],
    });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/my-model']?.status).toBe(
      KueueWorkloadStatus.Inadmissible,
    );
  });

  it('workloadName comes from the winning Workload, not the first one', () => {
    const uid0 = 'uid-first';
    const uid1 = 'uid-second';
    // First workload is Running, second is Inadmissible — Inadmissible wins.
    const wlRunning = workloadWithPodOwnerRef('wl-running', uid0, WorkloadStatusType.Running);
    const wlInadmissible = workloadWithPodOwnerRef(
      'wl-inadmissible',
      uid1,
      WorkloadStatusType.Inadmissible,
    );
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'InferenceService/my-model': [wlRunning, wlInadmissible],
    });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(
      result.current.kueueStatusByDeploymentKey['InferenceService/my-model']?.workloadName,
    ).toBe('wl-inadmissible');
  });

  it('all-running: aggregation returns Running', () => {
    const wl0 = workloadWithPodOwnerRef('wl-0', 'uid-0', WorkloadStatusType.Running);
    const wl1 = workloadWithPodOwnerRef('wl-1', 'uid-1', WorkloadStatusType.Running);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'InferenceService/my-model': [wl0, wl1],
    });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService('my-model')], project),
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/my-model']?.status).toBe(
      KueueWorkloadStatus.Running,
    );
  });

  it('two IS resources get independent status entries', () => {
    const wlA = workloadWithPodOwnerRef('wl-a', 'uid-a', WorkloadStatusType.Inadmissible);
    const wlB = workloadWithPodOwnerRef('wl-b', 'uid-b', WorkloadStatusType.Running);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      'InferenceService/model-a': [wlA],
      'InferenceService/model-b': [wlB],
    });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments(
        [inferenceService('model-a'), inferenceService('model-b')],
        project,
      ),
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/model-a']?.status).toBe(
      KueueWorkloadStatus.Inadmissible,
    );
    expect(result.current.kueueStatusByDeploymentKey['InferenceService/model-b']?.status).toBe(
      KueueWorkloadStatus.Running,
    );
  });

  it('same-name IS and LLMIS retain independent Kueue statuses', () => {
    const shared = 'shared-name';
    const wlIs = workloadWithPodOwnerRef('wl-is', 'uid-is', WorkloadStatusType.Inadmissible);
    const wlLlmis = workloadWithPodOwnerRef('wl-llmis', 'uid-llmis', WorkloadStatusType.Running);
    buildWorkloadMapForDeploymentsMock.mockReturnValue({
      [`InferenceService/${shared}`]: [wlIs],
      [`LLMInferenceService/${shared}`]: [wlLlmis],
    });

    const { result } = renderHook(() =>
      useKueueStatusForDeployments([inferenceService(shared)], project, [
        { metadata: { name: shared } },
      ]),
    );
    expect(result.current.kueueStatusByDeploymentKey[`InferenceService/${shared}`]?.status).toBe(
      KueueWorkloadStatus.Inadmissible,
    );
    expect(result.current.kueueStatusByDeploymentKey[`LLMInferenceService/${shared}`]?.status).toBe(
      KueueWorkloadStatus.Running,
    );
  });
});
