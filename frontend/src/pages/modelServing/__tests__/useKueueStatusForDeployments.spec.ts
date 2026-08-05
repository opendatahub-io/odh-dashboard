import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { WorkloadStatusType } from '#~/concepts/distributedWorkloads/utils';
import {
  KueueFilteringState,
  useKueueConfiguration,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import {
  buildWorkloadMapForDeployments,
  useWatchWorkloads,
  useWatchISPods,
} from '#~/api/k8s/workloads';
import { useKueueStatusForDeployments } from '#~/pages/modelServing/useKueueStatusForDeployments';
import type { WorkloadKind } from '#~/k8sTypes';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('#~/api/k8s/workloads', () => ({
  ...jest.requireActual('#~/api/k8s/workloads'),
  useWatchWorkloads: jest.fn(),
  useWatchISPods: jest.fn(),
  buildWorkloadMapForDeployments: jest.fn(),
}));

const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useWatchWorkloadsMock = jest.mocked(useWatchWorkloads);
const useWatchISPodsMock = jest.mocked(useWatchISPods);
const buildWorkloadMapMock = jest.mocked(buildWorkloadMapForDeployments);

const IS_NAME = 'my-model';
const NS = 'test-project';
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

/** Pod whose UID matches POD_UID and carries the IS label. */
function isPod(isName: string, uid = POD_UID): PodKind {
  const pod = mockPodK8sResource({
    name: `model-predictor-${uid.slice(0, 8)}`,
    namespace: NS,
    labels: { 'serving.kserve.io/inferenceservice': isName },
  });
  return { ...pod, metadata: { ...pod.metadata, uid } };
}

/** Workload whose ownerRef points to a Pod by UID. */
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
    useKueueConfigurationMock.mockReturnValue(mockKueueEnabled);
    useWatchWorkloadsMock.mockReturnValue([[], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[], true, undefined]);
    buildWorkloadMapMock.mockReturnValue({});
  });

  // --- Kueue disabled paths ---
  describe('when Kueue is not active', () => {
    it.each([
      ['feature disabled', { isKueueFeatureEnabled: false, isProjectKueueEnabled: true }],
      ['project not Kueue-enabled', { isKueueFeatureEnabled: true, isProjectKueueEnabled: false }],
      ['both disabled', { isKueueFeatureEnabled: false, isProjectKueueEnabled: false }],
    ])('%s — returns empty map and passes undefined to both watches', (_, flags) => {
      useKueueConfigurationMock.mockReturnValue({ ...mockKueueEnabled, ...flags });
      const { result } = testHook(useKueueStatusForDeployments)(
        [inferenceService(IS_NAME)],
        project,
      );
      expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
      expect(useWatchISPodsMock).toHaveBeenCalledWith(undefined);
      expect(result.current.kueueStatusByISName).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('undefined project — passes undefined to both watches', () => {
      useKueueConfigurationMock.mockReturnValue({
        ...mockKueueEnabled,
        isKueueFeatureEnabled: false,
        isProjectKueueEnabled: false,
      });
      testHook(useKueueStatusForDeployments)([], undefined);
      expect(useKueueConfigurationMock).toHaveBeenCalledWith(undefined);
      expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
      expect(useWatchISPodsMock).toHaveBeenCalledWith(undefined);
    });
  });

  // --- Watch setup ---
  it('passes project namespace to both watches when Kueue is active', () => {
    testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(NS);
    expect(useWatchISPodsMock).toHaveBeenCalledWith(NS);
  });

  // --- Loading ---
  it('isLoading true when workloads watch not yet loaded', () => {
    useWatchWorkloadsMock.mockReturnValue([[], false, undefined]);
    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('isLoading true when pods watch not yet loaded', () => {
    useWatchISPodsMock.mockReturnValue([[], false, undefined]);
    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading false when both watches loaded', () => {
    useWatchWorkloadsMock.mockReturnValue([[], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[], true, undefined]);
    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.isLoading).toBe(false);
  });

  // --- Error ---
  it('surfaces workload watch error message', () => {
    useWatchWorkloadsMock.mockReturnValue([[], true, new Error('network failure')]);
    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.error).toBe('network failure');
    expect(result.current.isLoading).toBe(false);
  });

  // --- Status map population ---
  it('returns null for IS when buildWorkloadMapForDeployments returns empty array', () => {
    buildWorkloadMapMock.mockReturnValue({ [IS_NAME]: [] });
    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.kueueStatusByISName[IS_NAME]).toBeNull();
  });

  it('returns aggregated Kueue status for IS when workload matches', () => {
    const wl = workloadWithPodOwnerRef('wl-1', POD_UID, WorkloadStatusType.Pending);
    buildWorkloadMapMock.mockReturnValue({ [IS_NAME]: [wl] });
    useWatchWorkloadsMock.mockReturnValue([[wl], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[isPod(IS_NAME)], true, undefined]);

    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.kueueStatusByISName[IS_NAME]).toEqual(
      expect.objectContaining({
        status: KueueWorkloadStatus.Queued,
        workloadName: 'wl-1',
      }),
    );
  });

  it('includes queueName from IS kueue.x-k8s.io/queue-name label', () => {
    const is = inferenceService(IS_NAME);
    is.metadata.labels = { ...is.metadata.labels, 'kueue.x-k8s.io/queue-name': 'my-queue' };
    const wl = workloadWithPodOwnerRef('wl-q', POD_UID, WorkloadStatusType.Running);
    buildWorkloadMapMock.mockReturnValue({ [IS_NAME]: [wl] });
    useWatchWorkloadsMock.mockReturnValue([[wl], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[isPod(IS_NAME)], true, undefined]);

    const { result } = testHook(useKueueStatusForDeployments)([is], project);
    expect(result.current.kueueStatusByISName[IS_NAME]).toEqual(
      expect.objectContaining({ queueName: 'my-queue' }),
    );
  });

  // --- Multi-replica aggregation (most-restrictive-state wins) ---
  it('multi-replica IS: shows most restrictive state (Queued beats Running)', () => {
    const uidQueued = 'uid-pod-queued';
    const uidRunning = 'uid-pod-running';
    const wlQueued = workloadWithPodOwnerRef('wl-queued', uidQueued, WorkloadStatusType.Pending);
    const wlRunning = workloadWithPodOwnerRef('wl-running', uidRunning, WorkloadStatusType.Running);
    // buildWorkloadMap is mocked — return both workloads for the IS.
    buildWorkloadMapMock.mockReturnValue({ [IS_NAME]: [wlQueued, wlRunning] });
    useWatchWorkloadsMock.mockReturnValue([[wlQueued, wlRunning], true, undefined]);
    useWatchISPodsMock.mockReturnValue([
      [isPod(IS_NAME, uidQueued), isPod(IS_NAME, uidRunning)],
      true,
      undefined,
    ]);

    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    // Queued (Pending) is more restrictive than Running — must win.
    expect(result.current.kueueStatusByISName[IS_NAME]).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Queued }),
    );
  });

  it('multi-replica IS: all Running → status is Running', () => {
    const uid0 = 'uid-r0';
    const uid1 = 'uid-r1';
    const wl0 = workloadWithPodOwnerRef('wl-r0', uid0, WorkloadStatusType.Running);
    const wl1 = workloadWithPodOwnerRef('wl-r1', uid1, WorkloadStatusType.Running);
    buildWorkloadMapMock.mockReturnValue({ [IS_NAME]: [wl0, wl1] });
    useWatchWorkloadsMock.mockReturnValue([[wl0, wl1], true, undefined]);
    useWatchISPodsMock.mockReturnValue([
      [isPod(IS_NAME, uid0), isPod(IS_NAME, uid1)],
      true,
      undefined,
    ]);

    const { result } = testHook(useKueueStatusForDeployments)([inferenceService(IS_NAME)], project);
    expect(result.current.kueueStatusByISName[IS_NAME]).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Running }),
    );
  });

  it('two IS in namespace get independent statuses', () => {
    const IS_A = 'model-a';
    const IS_B = 'model-b';
    const uidA = 'uid-a';
    const uidB = 'uid-b';
    const wlA = workloadWithPodOwnerRef('wl-a', uidA, WorkloadStatusType.Running);
    const wlB = workloadWithPodOwnerRef('wl-b', uidB, WorkloadStatusType.Pending);
    buildWorkloadMapMock.mockReturnValue({ [IS_A]: [wlA], [IS_B]: [wlB] });
    useWatchWorkloadsMock.mockReturnValue([[wlA, wlB], true, undefined]);
    useWatchISPodsMock.mockReturnValue([[isPod(IS_A, uidA), isPod(IS_B, uidB)], true, undefined]);

    const { result } = testHook(useKueueStatusForDeployments)(
      [inferenceService(IS_A), inferenceService(IS_B)],
      project,
    );
    expect(result.current.kueueStatusByISName[IS_A]).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Running }),
    );
    expect(result.current.kueueStatusByISName[IS_B]).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Queued }),
    );
  });
});
