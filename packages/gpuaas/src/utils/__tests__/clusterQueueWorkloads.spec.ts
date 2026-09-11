import type {
  K8sResourceCommon,
  LocalQueueKind,
  PodKind,
  WorkloadCondition,
  WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { WorkloadOwnerType } from '@odh-dashboard/k8s-core';
import { getPendingWorkloads } from '@odh-dashboard/internal/api/k8s/pendingWorkloads';
import { listAllLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import { getHardwareProfile } from '@odh-dashboard/internal/api/k8s/hardwareProfiles';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import {
  applyDisplayStatuses,
  applyQueuePositions,
  applyQueuePositionsToMap,
  buildLocalQueueByName,
  collectHardwareProfileRefs,
  fetchHardwareProfilesByKey,
  fetchLocalQueueClusterQueueIndex,
  fetchQueuePositions,
  filterAndMapClusterQueueWorkloads,
  filterAndMapNamespaceWorkloads,
  findWorkloadPods,
  formatWorkloadPriority,
  getNamespacesForClusterQueues,
  isGpuAwareWorkload,
  getWorkloadAcceleratorCount,
  isKueueManagedWorkload,
  isRayClusterWorkload,
  isRayJobWorkload,
  isTrainJobWorkload,
  getWorkloadJobKind,
  isServingWorkload,
  isTrainingJobWorkload,
  isWorkbenchWorkload,
  mapKueueStatusToQuotaUsageStatus,
  resolveQuotaUsageWorkloadStatus,
  mapWorkloadToRow,
  mapWorkloadsForClusterQueuesSync,
  mergePodsByUid,
  resolveWorkloadClusterQueue,
  resolveWorkloadLocalQueueName,
  resolveWorkloadType,
  workloadMatchesClusterQueue,
} from '../clusterQueueWorkloads';

jest.mock('@odh-dashboard/internal/api/k8s/pendingWorkloads', () => ({
  getPendingWorkloads: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/localQueues', () => ({
  ...jest.requireActual('@odh-dashboard/internal/api/k8s/localQueues'),
  listAllLocalQueues: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/hardwareProfiles', () => ({
  getHardwareProfile: jest.fn(),
  listHardwareProfiles: jest.fn().mockResolvedValue([]),
}));

jest.mock('@odh-dashboard/internal/api/k8s/inferenceServices', () => ({
  listInferenceService: jest.fn().mockResolvedValue([]),
}));

const getPendingWorkloadsMock = jest.mocked(getPendingWorkloads);
const listAllLocalQueuesMock = jest.mocked(listAllLocalQueues);
const getHardwareProfileMock = jest.mocked(getHardwareProfile);

const NS = 'dsp-1';
const CQ = 'gpu-cq';
const LQ = 'user-queue';

const baseWorkload = (overrides: Partial<WorkloadKind> = {}): WorkloadKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'Workload',
  metadata: {
    name: 'wl-1',
    namespace: NS,
    ...(overrides.metadata ?? {}),
  },
  spec: {
    active: true,
    podSets: [
      {
        count: 1,
        name: 'main',
        template: {
          metadata: {},
          spec: {
            containers: [
              {
                name: 'main',
                image: 'test-image',
                env: [],
                resources: { requests: { 'nvidia.com/gpu': '2' } },
              },
            ],
          },
        },
      },
    ],
    queueName: LQ,
    ...(overrides.spec ?? {}),
  },
  ...(overrides.status ? { status: overrides.status } : {}),
});

const localQueue = (name: string, clusterQueue: string): LocalQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'LocalQueue',
  metadata: { name, namespace: NS },
  spec: { clusterQueue },
});

const admittedConditions: WorkloadCondition[] = [
  {
    type: 'QuotaReserved',
    status: 'True',
    reason: 'QuotaReserved',
    message: 'Quota reserved',
    lastTransitionTime: '2026-01-01T00:00:00Z',
  },
  {
    type: 'Admitted',
    status: 'True',
    reason: 'Admitted',
    message: 'Admitted',
    lastTransitionTime: '2026-01-01T00:00:00Z',
  },
];

const queuedConditions: WorkloadCondition[] = [
  {
    type: 'QuotaReserved',
    status: 'False',
    reason: 'Pending',
    message: 'Waiting',
    lastTransitionTime: '2026-01-01T00:00:00Z',
  },
];

const completeConditions: WorkloadCondition[] = [
  ...admittedConditions,
  {
    type: 'Finished',
    status: 'True',
    reason: 'Succeeded',
    message: 'Succeeded',
    lastTransitionTime: '2026-01-02T00:00:00Z',
  },
];

const failedConditions: WorkloadCondition[] = [
  {
    type: 'Finished',
    status: 'True',
    reason: 'Failed',
    message: 'Job failed',
    lastTransitionTime: '2026-01-02T00:00:00Z',
  },
];

const makePod = (
  uid: string,
  labels: Record<string, string>,
  options: {
    ready?: boolean;
    phase?: PodKind['status'] extends infer S ? (S extends { phase?: infer P } ? P : never) : never;
  } = {},
): PodKind =>
  ({
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { name: `pod-${uid}`, namespace: NS, uid, labels },
    spec: {
      containers: [{ name: 'main', image: 'test-image' }],
    },
    status: {
      phase: options.phase ?? 'Running',
      ...(options.ready !== false && (options.phase ?? 'Running') === 'Running'
        ? {
            containerStatuses: [
              {
                name: 'main',
                ready: true,
                state: { running: { startedAt: '2026-01-01T00:00:00Z' } },
              },
            ],
          }
        : {}),
    },
  } as PodKind);

describe('clusterQueueWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('workloadMatchesClusterQueue', () => {
    const localQueueByName = buildLocalQueueByName([localQueue(LQ, CQ)]);

    it('matches admitted workloads on the cluster queue', () => {
      const workload = baseWorkload({
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      expect(workloadMatchesClusterQueue(workload, CQ, localQueueByName)).toBe(true);
    });

    it('matches pending workloads targeting the cluster queue via local queue', () => {
      const workload = baseWorkload({ status: { conditions: queuedConditions } });
      expect(workloadMatchesClusterQueue(workload, CQ, localQueueByName)).toBe(true);
    });

    it('collects hardware profile references from workload pod-set annotations', () => {
      const workload = baseWorkload({
        spec: {
          queueName: LQ,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {
                  annotations: {
                    'opendatahub.io/hardware-profile-name': 'gpu-profile',
                    'opendatahub.io/hardware-profile-namespace': NS,
                  },
                },
                spec: {
                  containers: [],
                },
              },
            },
          ],
        },
      });

      expect(
        collectHardwareProfileRefs([
          {
            namespace: NS,
            workloads: [workload],
            localQueues: [],
            pods: [],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ]),
      ).toEqual([{ name: 'gpu-profile', namespace: NS }]);
    });

    it('excludes workloads on a different cluster queue', () => {
      const workload = baseWorkload({
        status: {
          admission: { clusterQueue: 'other-cq', podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      expect(workloadMatchesClusterQueue(workload, CQ, localQueueByName)).toBe(false);
    });
  });

  describe('resolveWorkloadType', () => {
    it('resolves workbench workloads from job-name label and owner refs', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'nb-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'my-nb' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'my-nb', uid: 'job-uid' }],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Workbench);
      expect(isWorkbenchWorkload(workload)).toBe(true);
    });

    it('resolves workbench workloads from StatefulSet owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'wb-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.StatefulSet, name: 'my-nb', uid: 'ss-uid' },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Workbench);
      expect(isWorkbenchWorkload(workload)).toBe(true);
    });

    it('resolves workbench workloads from Kueue job-owner annotations when ownerReferences are absent', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'statefulset-umb-wkb-89877',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-uid': '5ff915da-2bc6-43a1-a13b-1a78cc822c89' },
          annotations: {
            'kueue.x-k8s.io/job-owner-name': 'umb-wkb',
            'kueue.x-k8s.io/job-owner-gvk': 'apps/v1, Kind=StatefulSet',
          },
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Workbench);
      expect(isWorkbenchWorkload(workload)).toBe(true);
    });

    it('resolves ray cluster workloads from RayCluster owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'ray-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.RayCluster, name: 'ray', uid: 'ray-uid' },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.RayCluster);
      expect(isRayClusterWorkload(workload)).toBe(true);
    });

    it('resolves RayJob workloads as Train', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rayjob-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'ray.io/v1', kind: 'RayJob', name: 'ray-job', uid: 'rayjob-uid' },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Train);
      expect(isRayJobWorkload(workload)).toBe(true);
    });

    it('resolves RayJob workloads from job-uid label as Train', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rayjob-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-uid': 'rayjob-cr-uid' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'ray-job', uid: 'job-uid' }],
        },
      });
      const jobKindByUid = new Map([['rayjob-cr-uid', 'RayJob' as const]]);
      expect(resolveWorkloadType(workload, [], jobKindByUid)).toBe(QuotaUsageWorkloadTypes.Train);
      expect(isRayJobWorkload(workload, jobKindByUid)).toBe(true);
      expect(getWorkloadJobKind(workload, jobKindByUid)).toBe('RayJob');
    });

    it('resolves train workloads from TrainJob owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'train-wl',
          namespace: NS,
          ownerReferences: [
            {
              apiVersion: 'trainer.kubeflow.org/v1alpha1',
              kind: 'TrainJob',
              name: 'train-job',
              uid: 'trainjob-uid',
            },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Train);
      expect(isTrainJobWorkload(workload)).toBe(true);
      expect(getWorkloadJobKind(workload)).toBe('TrainJob');
    });

    it('resolves train workloads from job-uid label matching a TrainJob CR', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'train-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-uid': 'trainjob-cr-uid' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'train-job', uid: 'job-uid' }],
        },
      });
      const jobKindByUid = new Map([['trainjob-cr-uid', 'TrainJob' as const]]);
      expect(resolveWorkloadType(workload, [], jobKindByUid)).toBe(QuotaUsageWorkloadTypes.Train);
      expect(isTrainJobWorkload(workload, jobKindByUid)).toBe(true);
      expect(getWorkloadJobKind(workload, jobKindByUid)).toBe('TrainJob');
    });

    it('classifies generic Job-owned workloads as Batch when not a TrainJob or RayJob', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'batch-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'batch-job', uid: 'job-uid' }],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Batch);
      expect(isTrainingJobWorkload(workload)).toBe(true);
      expect(getWorkloadJobKind(workload)).toBeUndefined();
    });

    it('resolves serving workloads from Pod owner single-hop labels', () => {
      const podUid = 'serving-pod';
      const workload = baseWorkload({
        metadata: {
          name: 'serving-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'pod', uid: podUid }],
        },
      });
      const pods = [makePod(podUid, { 'serving.kserve.io/inferenceservice': 'my-model' })];
      expect(resolveWorkloadType(workload, pods)).toBe(QuotaUsageWorkloadTypes.Serve);
      expect(isServingWorkload(workload, pods)).toBe(true);
    });

    it('resolves serving workloads from ReplicaSet owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rs-serving-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Serve);
    });

    it('resolves serving workloads from LeaderWorkerSet owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'lws-serving-wl',
          namespace: NS,
          ownerReferences: [
            {
              apiVersion: 'v1',
              kind: WorkloadOwnerType.LeaderWorkerSet,
              name: 'lws',
              uid: 'lws-uid',
            },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Serve);
    });

    it('falls back to unknown for unclassified pod workloads', () => {
      const podUid = 'infra-pod';
      const workload = baseWorkload({
        metadata: {
          name: 'unknown-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'pod', uid: podUid }],
        },
      });
      const pods = [makePod(podUid, { component: 'data-science-pipelines' })];
      expect(resolveWorkloadType(workload, pods)).toBe(QuotaUsageWorkloadTypes.Unknown);
    });
  });

  describe('mergePodsByUid', () => {
    it('dedupes pods by uid and keeps the latest entry', () => {
      const podA = makePod('uid-a', { role: 'old' });
      const podB = makePod('uid-b', {});
      const podAUpdated = makePod('uid-a', { role: 'new' });

      expect(mergePodsByUid([[podA, podB], [podAUpdated]])).toEqual([podAUpdated, podB]);
    });
  });

  describe('mapKueueStatusToQuotaUsageStatus', () => {
    it.each([
      [KueueWorkloadStatus.Queued, QuotaUsageWorkloadStatuses.Queued],
      [KueueWorkloadStatus.Failed, QuotaUsageWorkloadStatuses.Failed],
      [KueueWorkloadStatus.Preempted, QuotaUsageWorkloadStatuses.Preempted],
      [KueueWorkloadStatus.Evicted, QuotaUsageWorkloadStatuses.Evicted],
      [KueueWorkloadStatus.Requeued, QuotaUsageWorkloadStatuses.Requeued],
      [KueueWorkloadStatus.Inadmissible, QuotaUsageWorkloadStatuses.Inadmissible],
      [KueueWorkloadStatus.AdmissionCheck, QuotaUsageWorkloadStatuses.AdmissionCheck],
      [
        KueueWorkloadStatus.BlockedOnPreemptionGates,
        QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates,
      ],
      [KueueWorkloadStatus.Running, QuotaUsageWorkloadStatuses.Running],
      [KueueWorkloadStatus.Admitted, QuotaUsageWorkloadStatuses.Admitted],
      [KueueWorkloadStatus.Complete, QuotaUsageWorkloadStatuses.Complete],
    ])('maps %s to %s', (kueueStatus, expected) => {
      expect(mapKueueStatusToQuotaUsageStatus(kueueStatus)).toBe(expected);
    });
  });

  describe('isGpuAwareWorkload', () => {
    it('returns true when workload requests accelerator resources', () => {
      expect(isGpuAwareWorkload(baseWorkload())).toBe(true);
    });

    it('returns false for CPU-only resource requests', () => {
      const cpuOnly = baseWorkload({
        spec: {
          active: true,
          queueName: LQ,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {},
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'test-image',
                      env: [],
                      resources: { requests: { cpu: '1', memory: '1Gi' } },
                    },
                  ],
                },
              },
            },
          ],
        },
      });
      expect(isGpuAwareWorkload(cpuOnly)).toBe(false);
    });

    it('returns true when accelerators are declared in limits only', () => {
      const limitOnlyGpu = baseWorkload({
        spec: {
          active: true,
          queueName: LQ,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {},
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'test-image',
                      env: [],
                      resources: { limits: { 'nvidia.com/gpu': '2' } },
                    },
                  ],
                },
              },
            },
          ],
        },
      });
      expect(isGpuAwareWorkload(limitOnlyGpu)).toBe(true);
      expect(getWorkloadAcceleratorCount(limitOnlyGpu)).toBe(2);
    });

    it('parses kubernetes quantity strings for accelerator resources', () => {
      const milliGpu = baseWorkload({
        spec: {
          active: true,
          queueName: LQ,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {},
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'test-image',
                      env: [],
                      resources: { requests: { 'nvidia.com/gpu': '3000m' } },
                    },
                  ],
                },
              },
            },
          ],
        },
      });
      expect(isGpuAwareWorkload(milliGpu)).toBe(true);
      expect(getWorkloadAcceleratorCount(milliGpu)).toBe(3);
    });
  });

  describe('filterAndMapClusterQueueWorkloads', () => {
    const projectDisplayNames = new Map([[NS, 'DSP One']]);

    it('maps active, Complete, and Failed workloads', () => {
      const admitted = baseWorkload({
        metadata: {
          name: 'admitted-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'nb-admitted' },
          ownerReferences: [
            { apiVersion: 'v1', kind: 'Job', name: 'nb-admitted', uid: 'job-admitted' },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const queued = baseWorkload({
        metadata: {
          name: 'queued-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'nb' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'nb', uid: 'job' }],
        },
        status: { conditions: queuedConditions },
      });
      const complete = baseWorkload({
        metadata: { name: 'complete-wl', namespace: NS },
        status: { conditions: completeConditions },
      });
      const failed = baseWorkload({
        metadata: { name: 'failed-wl', namespace: NS },
        status: { conditions: failedConditions },
      });

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [admitted, queued, complete, failed],
            localQueues: [localQueue(LQ, CQ)],
            pods: [],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
      );

      expect(rows).toHaveLength(4);
      expect(rows.find((row) => row.name === 'admitted-wl')).toMatchObject({
        project: 'DSP One',
        clusterQueue: CQ,
        status: QuotaUsageWorkloadStatuses.Admitted,
        localQueue: LQ,
        accelerators: 2,
        queuePosition: undefined,
      });
      expect(rows.find((row) => row.name === 'queued-wl')).toMatchObject({
        type: QuotaUsageWorkloadTypes.Workbench,
        status: QuotaUsageWorkloadStatuses.Queued,
      });
      expect(rows.find((row) => row.name === 'complete-wl')).toMatchObject({
        status: QuotaUsageWorkloadStatuses.Complete,
      });
      expect(rows.find((row) => row.name === 'failed-wl')).toMatchObject({
        status: QuotaUsageWorkloadStatuses.Failed,
      });
    });

    it('excludes workloads not actively managed by Kueue', () => {
      const admitted = baseWorkload({
        metadata: {
          name: 'admitted-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'nb-admitted' },
          ownerReferences: [
            { apiVersion: 'v1', kind: 'Job', name: 'nb-admitted', uid: 'job-admitted' },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const autoCreatedNotebook = baseWorkload({
        metadata: {
          name: 'auto-notebook-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'nb' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'nb', uid: 'job' }],
        },
        spec: { queueName: undefined, active: true, podSets: baseWorkload().spec.podSets },
        status: { conditions: queuedConditions },
      });
      const servingWithoutQueueLabel = baseWorkload({
        metadata: {
          name: 'serving-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'pod-1', uid: 'pod-uid' }],
        },
        status: { conditions: queuedConditions },
      });
      const servingPod = makePod('pod-uid', { 'serving.kserve.io/inferenceservice': 'is-1' });
      const servingWithQueueLabel = baseWorkload({
        metadata: {
          name: 'serving-kueue-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'pod-2', uid: 'pod-uid-2' }],
        },
        status: { conditions: queuedConditions },
      });
      const servingPodWithQueue = makePod('pod-uid-2', {
        'serving.kserve.io/inferenceservice': 'is-2',
        'kueue.x-k8s.io/queue-name': LQ,
      });

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [
              admitted,
              autoCreatedNotebook,
              servingWithoutQueueLabel,
              servingWithQueueLabel,
            ],
            localQueues: [localQueue(LQ, CQ)],
            pods: [servingPod, servingPodWithQueue],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
      );

      expect(rows.map((row) => row.name)).toEqual(['admitted-wl', 'serving-kueue-wl']);
    });

    it('excludes Kueue-managed workloads without accelerator requests', () => {
      const cpuOnly = baseWorkload({
        metadata: {
          name: 'cpu-only-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-name': 'nb-cpu' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'nb-cpu', uid: 'job-cpu' }],
        },
        spec: {
          active: true,
          queueName: LQ,
          podSets: [
            {
              count: 1,
              name: 'main',
              template: {
                metadata: {},
                spec: {
                  containers: [
                    {
                      name: 'main',
                      image: 'test-image',
                      env: [],
                      resources: { requests: { cpu: '1', memory: '1Gi' } },
                    },
                  ],
                },
              },
            },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [cpuOnly],
            localQueues: [localQueue(LQ, CQ)],
            pods: [],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
      );

      expect(rows).toHaveLength(0);
    });

    it('includes admitted infrastructure workloads with unknown type', () => {
      const infraWorkload = baseWorkload({
        metadata: {
          name: 'pod-bin-packing-scheduler-6b7f99547f-kmzgx-a8631',
          namespace: NS,
          ownerReferences: [
            {
              apiVersion: 'v1',
              kind: 'Pod',
              name: 'bin-packing-scheduler-6b7f99547f-kmzgx',
              uid: 'pod-uid',
            },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const infraPod = makePod('pod-uid', {
        component: 'bin-packing-scheduler',
        'kueue.x-k8s.io/queue-name': LQ,
      });

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [infraWorkload],
            localQueues: [localQueue(LQ, CQ)],
            pods: [infraPod],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'pod-bin-packing-scheduler-6b7f99547f-kmzgx-a8631',
        type: QuotaUsageWorkloadTypes.Unknown,
      });
    });

    it('includes admitted ReplicaSet-owned serving workloads with Kueue-labeled descendant pods', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rs-serving-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const servingPod = {
        ...makePod('pod-uid', {
          'serving.kserve.io/inferenceservice': 'is-1',
          'kueue.x-k8s.io/queue-name': LQ,
        }),
        metadata: {
          name: 'serving-pod',
          namespace: NS,
          uid: 'pod-uid',
          labels: {
            'serving.kserve.io/inferenceservice': 'is-1',
            'kueue.x-k8s.io/queue-name': LQ,
          },
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
      } as PodKind;

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [workload],
            localQueues: [localQueue(LQ, CQ)],
            pods: [servingPod],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'rs-serving-wl',
        type: QuotaUsageWorkloadTypes.Serve,
        status: QuotaUsageWorkloadStatuses.Admitted,
      });
    });
  });

  describe('isKueueManagedWorkload', () => {
    const localQueueByName = buildLocalQueueByName([localQueue(LQ, CQ)]);

    it('returns false when workload has no queue assignment and is not admitted', () => {
      const workload = baseWorkload({
        spec: { queueName: undefined, active: true, podSets: baseWorkload().spec.podSets },
      });
      expect(isKueueManagedWorkload(workload, [], localQueueByName)).toBe(false);
    });

    it('returns false for serving workloads when correlated pod lacks queue-name label', () => {
      const workload = baseWorkload({
        metadata: {
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'pod-1', uid: 'pod-uid' }],
        },
      });
      const pod = makePod('pod-uid', { 'serving.kserve.io/inferenceservice': 'is-1' });
      expect(isKueueManagedWorkload(workload, [pod], localQueueByName)).toBe(false);
    });

    it('returns false for serving workloads when no correlated pods are available', () => {
      const workload = baseWorkload({
        metadata: {
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
      });
      expect(isKueueManagedWorkload(workload, [], localQueueByName)).toBe(false);
    });

    it('returns true for ReplicaSet-owned serving workloads with Kueue-labeled descendant pods', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rs-serving-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const servingPod = {
        ...makePod('pod-uid', {
          'serving.kserve.io/inferenceservice': 'is-1',
          'kueue.x-k8s.io/queue-name': LQ,
        }),
        metadata: {
          name: 'serving-pod',
          namespace: NS,
          uid: 'pod-uid',
          labels: {
            'serving.kserve.io/inferenceservice': 'is-1',
            'kueue.x-k8s.io/queue-name': LQ,
          },
          ownerReferences: [
            { apiVersion: 'v1', kind: WorkloadOwnerType.ReplicaSet, name: 'rs', uid: 'rs-uid' },
          ],
        },
      } as PodKind;

      expect(isKueueManagedWorkload(workload, [servingPod], localQueueByName)).toBe(true);
    });
  });

  describe('fetchQueuePositions', () => {
    it('returns 1-indexed positions for queued workloads', async () => {
      getPendingWorkloadsMock.mockResolvedValue({
        items: [
          {
            metadata: { name: 'queued-wl', namespace: NS },
            priority: 100,
            localQueueName: LQ,
            positionInClusterQueue: 0,
            positionInLocalQueue: 2,
          },
        ],
      });

      const positions = await fetchQueuePositions([
        {
          name: 'queued-wl',
          namespace: NS,
          project: 'DSP One',
          clusterQueue: CQ,
          type: QuotaUsageWorkloadTypes.Workbench,
          status: QuotaUsageWorkloadStatuses.Queued,
          localQueue: LQ,
          accelerators: 1,
          queuePosition: undefined,
        },
      ]);

      expect(getPendingWorkloadsMock).toHaveBeenCalledWith(NS, LQ);
      expect(positions.get(`${NS}/queued-wl`)).toBe(3);
    });

    it('does not fetch positions for admitted workloads', async () => {
      await fetchQueuePositions([
        {
          name: 'admitted-wl',
          namespace: NS,
          project: 'DSP One',
          clusterQueue: CQ,
          type: QuotaUsageWorkloadTypes.Train,
          status: QuotaUsageWorkloadStatuses.Admitted,
          localQueue: LQ,
          accelerators: 1,
          queuePosition: undefined,
        },
      ]);

      expect(getPendingWorkloadsMock).not.toHaveBeenCalled();
    });

    it('handles Visibility API 403 gracefully', async () => {
      getPendingWorkloadsMock.mockRejectedValue({ status: 403 });

      const rows = [
        {
          name: 'queued-wl',
          namespace: NS,
          project: 'DSP One',
          clusterQueue: CQ,
          type: QuotaUsageWorkloadTypes.Workbench,
          status: QuotaUsageWorkloadStatuses.Queued,
          localQueue: LQ,
          accelerators: 1,
          queuePosition: undefined,
        },
      ];

      const positions = await fetchQueuePositions(rows);
      expect(positions.size).toBe(0);
      expect(applyQueuePositions(rows, positions)[0].queuePosition).toBeUndefined();
    });
  });

  describe('resolveWorkloadLocalQueueName', () => {
    it('prefers StatefulSet queue label over workload spec (workbench pattern)', () => {
      const workload = baseWorkload({
        spec: { queueName: 'spec-queue', active: true, podSets: baseWorkload().spec.podSets },
        metadata: {
          ownerReferences: [
            {
              apiVersion: 'apps/v1',
              kind: WorkloadOwnerType.StatefulSet,
              name: 'nb-sts',
              uid: 'sts-uid',
            },
          ],
        },
      });
      const statefulSetsByName = new Map<string, K8sResourceCommon>([
        [
          'nb-sts',
          {
            apiVersion: 'apps/v1',
            kind: 'StatefulSet',
            metadata: {
              name: 'nb-sts',
              labels: { 'kueue.x-k8s.io/queue-name': 'label-queue' },
            },
          },
        ],
      ]);

      expect(resolveWorkloadLocalQueueName(workload, [], statefulSetsByName, new Map())).toBe(
        'label-queue',
      );
    });

    it('resolves StatefulSet queue label from Kueue job-owner annotations', () => {
      const workload = baseWorkload({
        metadata: {
          annotations: {
            'kueue.x-k8s.io/job-owner-name': 'umb-wkb',
            'kueue.x-k8s.io/job-owner-gvk': 'apps/v1, Kind=StatefulSet',
          },
        },
        spec: { queueName: 'spec-queue', active: true, podSets: baseWorkload().spec.podSets },
      });
      const statefulSetsByName = new Map<string, K8sResourceCommon>([
        [
          'umb-wkb',
          {
            apiVersion: 'apps/v1',
            kind: 'StatefulSet',
            metadata: {
              name: 'umb-wkb',
              labels: { 'kueue.x-k8s.io/queue-name': 'default' },
            },
          },
        ],
      ]);

      expect(resolveWorkloadLocalQueueName(workload, [], statefulSetsByName, new Map())).toBe(
        'default',
      );
    });
  });

  describe('resolveQuotaUsageWorkloadStatus', () => {
    it('maps admitted Workload CR conditions to Admitted regardless of pod readiness', () => {
      const podUid = 'serve-pod-uid';
      const workload = baseWorkload({
        metadata: {
          name: 'serve-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Pod', name: 'serve-pod', uid: podUid }],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });

      expect(resolveQuotaUsageWorkloadStatus(workload)).toBe(QuotaUsageWorkloadStatuses.Admitted);
    });

    it('maps queued Workload CR conditions to Queued', () => {
      const workload = baseWorkload({ status: { conditions: queuedConditions } });
      expect(resolveQuotaUsageWorkloadStatus(workload)).toBe(QuotaUsageWorkloadStatuses.Queued);
    });

    it('returns Running only when Kueue PodsReady is set on the Workload CR', () => {
      const workload = baseWorkload({
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: [
            ...admittedConditions,
            {
              type: 'PodsReady',
              status: 'True',
              reason: 'PodsReady',
              message: 'All pods are ready',
              lastTransitionTime: '2026-01-01T00:00:00Z',
            },
          ],
        },
      });

      expect(resolveQuotaUsageWorkloadStatus(workload)).toBe(QuotaUsageWorkloadStatuses.Running);
    });
  });

  describe('mapWorkloadToRow', () => {
    it('maps priority without deriving a hardware profile from resource flavor admission', () => {
      const workload = baseWorkload({
        spec: {
          queueName: LQ,
          active: true,
          podSets: baseWorkload().spec.podSets,
          priority: 100,
          priorityClassRef: {
            group: 'kueue.x-k8s.io',
            kind: 'WorkloadPriorityClass',
            name: 'on-demand',
          },
        },
        status: {
          admission: {
            clusterQueue: CQ,
            podSetAssignments: [{ name: 'main', flavors: { 'nvidia.com/gpu': 'gpu-l40s' } }],
          },
          conditions: admittedConditions,
        },
      });

      const row = mapWorkloadToRow(
        workload,
        NS,
        'DSP One',
        [],
        buildLocalQueueByName([localQueue(LQ, CQ)]),
        new Map(),
        CQ,
      );

      expect(row).toMatchObject({
        clusterQueue: CQ,
        priority: 'on demand (100)',
        hardwareProfile: undefined,
      });
    });
  });

  describe('formatWorkloadPriority', () => {
    it('formats priority class name and numeric value together', () => {
      expect(
        formatWorkloadPriority(
          baseWorkload({
            spec: {
              queueName: LQ,
              active: true,
              podSets: baseWorkload().spec.podSets,
              priority: 100,
              priorityClassRef: {
                group: 'kueue.x-k8s.io',
                kind: 'WorkloadPriorityClass',
                name: 'on-demand',
              },
            },
          }),
        ),
      ).toBe('on demand (100)');
    });

    it('falls back to numeric priority when priority class name is missing', () => {
      expect(
        formatWorkloadPriority(
          baseWorkload({
            spec: {
              queueName: LQ,
              active: true,
              podSets: baseWorkload().spec.podSets,
              priority: 0,
            },
          }),
        ),
      ).toBe('0');

      expect(
        formatWorkloadPriority(
          baseWorkload({
            spec: {
              queueName: LQ,
              active: true,
              podSets: baseWorkload().spec.podSets,
              priority: 100,
            },
          }),
        ),
      ).toBe('100');
    });

    it('returns undefined when numeric priority is missing', () => {
      expect(
        formatWorkloadPriority(
          baseWorkload({
            spec: {
              queueName: LQ,
              active: true,
              podSets: baseWorkload().spec.podSets,
              priorityClassRef: {
                group: 'kueue.x-k8s.io',
                kind: 'WorkloadPriorityClass',
                name: 'on-demand',
              },
            },
          }),
        ),
      ).toBeUndefined();
    });
  });

  describe('resolveWorkloadClusterQueue', () => {
    it('resolves pending workloads via local queue target cluster queue', () => {
      const workload = baseWorkload({
        status: { conditions: queuedConditions },
      });
      const localQueueByName = buildLocalQueueByName([localQueue(LQ, CQ)]);

      expect(resolveWorkloadClusterQueue(workload, localQueueByName)).toBe(CQ);
    });
  });

  describe('filterAndMapNamespaceWorkloads', () => {
    it('maps all Kueue-managed workloads in a namespace regardless of cluster queue', () => {
      const admitted = baseWorkload({
        metadata: { name: 'admitted-wl', namespace: NS },
        status: { conditions: admittedConditions },
      });
      const queued = baseWorkload({
        metadata: { name: 'queued-wl', namespace: NS },
        status: { conditions: queuedConditions },
      });
      const complete = baseWorkload({
        metadata: { name: 'complete-wl', namespace: NS },
        status: { conditions: completeConditions },
      });

      const rows = filterAndMapNamespaceWorkloads(
        {
          namespace: NS,
          workloads: [admitted, queued, complete],
          localQueues: [localQueue(LQ, CQ)],
          pods: [],
          statefulSets: [],
          inferenceServices: [],
          jobKindByUid: new Map(),
        },
        'DSP One',
      );

      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.name)).toEqual(
        expect.arrayContaining(['admitted-wl', 'queued-wl', 'complete-wl']),
      );
    });
  });

  describe('applyDisplayStatuses', () => {
    const queuedRow = {
      name: 'queued-wl',
      namespace: NS,
      project: 'DSP One',
      clusterQueue: CQ,
      type: QuotaUsageWorkloadTypes.Train,
      status: QuotaUsageWorkloadStatuses.Queued,
      localQueue: LQ,
      accelerators: 2,
      queuePosition: undefined,
    };

    it('maps queued workloads without position to Pending', () => {
      const [row] = applyDisplayStatuses([queuedRow]);
      expect(row.status).toBe(QuotaUsageWorkloadStatuses.Pending);
    });

    it('keeps queued workloads with position as Queued', () => {
      const [row] = applyDisplayStatuses([{ ...queuedRow, queuePosition: 1 }]);
      expect(row.status).toBe(QuotaUsageWorkloadStatuses.Queued);
    });

    it('does not change admitted workloads', () => {
      const admittedRow = {
        ...queuedRow,
        status: QuotaUsageWorkloadStatuses.Admitted,
      };
      const [row] = applyDisplayStatuses([admittedRow]);
      expect(row.status).toBe(QuotaUsageWorkloadStatuses.Admitted);
    });
  });

  describe('fetchLocalQueueClusterQueueIndex', () => {
    it('builds a clusterQueueName -> Set<namespace> index from a single cluster-wide call', async () => {
      listAllLocalQueuesMock.mockResolvedValue([
        localQueue(LQ, CQ),
        { ...localQueue('other-lq', CQ), metadata: { name: 'other-lq', namespace: 'dsp-2' } },
        {
          ...localQueue('unrelated-lq', 'other-cq'),
          metadata: { name: 'unrelated-lq', namespace: 'dsp-3' },
        },
      ]);

      const index = await fetchLocalQueueClusterQueueIndex();

      expect(listAllLocalQueuesMock).toHaveBeenCalledTimes(1);
      expect(index.get(CQ)).toEqual(new Set(['dsp-1', 'dsp-2']));
      expect(index.get('other-cq')).toEqual(new Set(['dsp-3']));
    });

    it('skips LocalQueues missing a target cluster queue or namespace', async () => {
      listAllLocalQueuesMock.mockResolvedValue([
        { ...localQueue(LQ, ''), spec: { clusterQueue: '' } },
      ]);

      const index = await fetchLocalQueueClusterQueueIndex();
      expect(index.size).toBe(0);
    });
  });

  describe('getNamespacesForClusterQueues', () => {
    it('returns the union of namespaces for the requested cluster queues', () => {
      const index = new Map([
        [CQ, new Set(['dsp-1', 'dsp-2'])],
        ['other-cq', new Set(['dsp-3'])],
      ]);

      expect(getNamespacesForClusterQueues([CQ, 'other-cq'], index)).toEqual(
        new Set(['dsp-1', 'dsp-2', 'dsp-3']),
      );
    });

    it('returns an empty set for cluster queues absent from the index', () => {
      expect(getNamespacesForClusterQueues(['missing-cq'], new Map())).toEqual(new Set());
    });
  });

  describe('mapWorkloadsForClusterQueuesSync + applyQueuePositionsToMap', () => {
    const projectDisplayNames = new Map([[NS, 'DSP One']]);

    it('maps rows without fetching queue positions, then applies them separately', () => {
      const queued = baseWorkload({
        metadata: { name: 'queued-wl', namespace: NS },
        status: { conditions: queuedConditions },
      });

      const cache = {
        namespaceData: [
          {
            namespace: NS,
            workloads: [queued],
            localQueues: [localQueue(LQ, CQ)],
            pods: [],
            statefulSets: [],
            inferenceServices: [],
            jobKindByUid: new Map(),
          },
        ],
        hardwareProfileByKey: new Map(),
        hardwareProfilesForMatching: [],
      };

      const initial = mapWorkloadsForClusterQueuesSync([CQ], cache, projectDisplayNames);
      expect(getPendingWorkloadsMock).not.toHaveBeenCalled();
      expect(initial.get(CQ)?.[0]).toMatchObject({
        status: QuotaUsageWorkloadStatuses.Queued,
        queuePosition: undefined,
      });

      const withNoPositions = applyQueuePositionsToMap(initial, new Map());
      expect(withNoPositions.get(CQ)?.[0].status).toBe(QuotaUsageWorkloadStatuses.Pending);

      const withNoPositionsBeforeLoaded = applyQueuePositionsToMap(initial, new Map(), false);
      expect(withNoPositionsBeforeLoaded.get(CQ)?.[0].status).toBe(
        QuotaUsageWorkloadStatuses.Queued,
      );

      const withPositions = applyQueuePositionsToMap(initial, new Map([[`${NS}/queued-wl`, 1]]));
      expect(withPositions.get(CQ)?.[0]).toMatchObject({
        status: QuotaUsageWorkloadStatuses.Queued,
        queuePosition: 1,
      });
    });
  });

  describe('hardware profile resolution (annotation-based)', () => {
    const hardwareProfilePod = (overrides: Partial<PodKind['metadata']> = {}): PodKind =>
      ({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'nb-0',
          namespace: NS,
          uid: 'pod-uid-1',
          labels: { 'kueue.x-k8s.io/pod-group-name': 'wl-1' },
          annotations: {
            'opendatahub.io/hardware-profile-name': 'mig-7g',
            'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
          },
          ...overrides,
        },
        spec: {},
        status: { phase: 'Running' },
      } as PodKind);

    const hardwareProfileCr = {
      apiVersion: 'infrastructure.opendatahub.io/v1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'mig-7g',
        namespace: 'redhat-ods-applications',
        annotations: { 'opendatahub.io/display-name': 'Research notebook MIG 7g' },
      },
      spec: {
        identifiers: [
          { displayName: 'GPU', identifier: 'nvidia.com/mig-7g.80gb', resourceType: 'Accelerator' },
        ],
      },
    };

    it('finds a workload pod-group by the pod-group-name label', () => {
      const workload = baseWorkload({ metadata: { name: 'wl-1', namespace: NS } });
      const pod = hardwareProfilePod();
      expect(findWorkloadPods(workload, [pod])).toEqual([pod]);
    });

    it('collects distinct HardwareProfile refs from Pod annotations', () => {
      const pod = hardwareProfilePod();
      const refs = collectHardwareProfileRefs([
        {
          namespace: NS,
          workloads: [],
          localQueues: [],
          pods: [pod, pod],
          statefulSets: [],
          inferenceServices: [],
          jobKindByUid: new Map(),
        },
      ]);
      expect(refs).toEqual([{ name: 'mig-7g', namespace: 'redhat-ods-applications' }]);
    });

    it('fetches HardwareProfile CRs by ref, skipping errors', async () => {
      getHardwareProfileMock.mockResolvedValueOnce(hardwareProfileCr as never);
      const byKey = await fetchHardwareProfilesByKey([
        { name: 'mig-7g', namespace: 'redhat-ods-applications' },
      ]);
      expect(byKey.get('redhat-ods-applications/mig-7g')).toEqual(hardwareProfileCr);

      getHardwareProfileMock.mockRejectedValueOnce(new Error('not found'));
      const withError = await fetchHardwareProfilesByKey([
        { name: 'missing', namespace: 'redhat-ods-applications' },
      ]);
      expect(withError.size).toBe(0);
    });

    it('resolves hardwareProfile + hardwareProfileResourceType from the Pod annotation over ResourceFlavor', () => {
      const workload = baseWorkload({
        metadata: { name: 'wl-1', namespace: NS },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const pod = hardwareProfilePod();
      const hardwareProfileByKey = new Map([
        ['redhat-ods-applications/mig-7g', hardwareProfileCr as never],
      ]);

      const row = mapWorkloadToRow(
        workload,
        NS,
        'DSP One',
        [pod],
        buildLocalQueueByName([localQueue(LQ, CQ)]),
        new Map(),
        CQ,
        hardwareProfileByKey,
      );

      expect(row.hardwareProfile).toBe('Research notebook MIG 7g');
      expect(row.hardwareProfileResourceType).toBe('nvidia.com/mig-7g.80gb');
    });

    it('resolves hardware profile from StatefulSet pod template when the workbench is stopped (no pods)', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'statefulset-hrathina-test-checkpointing-fcd62',
          namespace: NS,
          ownerReferences: [
            {
              apiVersion: 'apps/v1',
              kind: 'StatefulSet',
              name: 'hrathina-test-checkpointing',
              uid: 'sts-uid',
            },
          ],
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const statefulSet = {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: { name: 'hrathina-test-checkpointing', namespace: NS, uid: 'sts-uid' },
        spec: {
          template: {
            metadata: {
              annotations: {
                'opendatahub.io/hardware-profile-name': 'default-profile',
                'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
              },
            },
          },
        },
      };
      const defaultProfileCr = {
        apiVersion: 'infrastructure.opendatahub.io/v1',
        kind: 'HardwareProfile',
        metadata: {
          name: 'default-profile',
          namespace: 'redhat-ods-applications',
          annotations: { 'opendatahub.io/display-name': 'default-profile' },
        },
        spec: {
          identifiers: [
            { displayName: 'GPU', identifier: 'nvidia.com/gpu', resourceType: 'Accelerator' },
          ],
        },
      };
      const hardwareProfileByKey = new Map([
        ['redhat-ods-applications/default-profile', defaultProfileCr as never],
      ]);
      const statefulSetsByName = new Map([['hrathina-test-checkpointing', statefulSet]]);

      const row = mapWorkloadToRow(
        workload,
        NS,
        'DSP One',
        [],
        buildLocalQueueByName([localQueue(LQ, CQ)]),
        new Map(),
        CQ,
        hardwareProfileByKey,
        statefulSetsByName,
      );

      expect(row.hardwareProfile).toBe('default-profile');
      expect(row.hardwareProfileResourceType).toBe('nvidia.com/gpu');
    });

    it('resolves hardware profile from StatefulSet via Kueue job-owner annotations (no ownerReferences)', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'statefulset-umb-wkb-89877',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-uid': '5ff915da-2bc6-43a1-a13b-1a78cc822c89' },
          annotations: {
            'kueue.x-k8s.io/job-owner-name': 'umb-wkb',
            'kueue.x-k8s.io/job-owner-gvk': 'apps/v1, Kind=StatefulSet',
          },
        },
        status: {
          admission: { clusterQueue: CQ, podSetAssignments: [] },
          conditions: admittedConditions,
        },
      });
      const statefulSet = {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: { name: 'umb-wkb', namespace: NS },
        spec: {
          template: {
            metadata: {
              annotations: {
                'opendatahub.io/hardware-profile-name': 'default-profile',
                'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
              },
            },
          },
        },
      };
      const defaultProfileCr = {
        apiVersion: 'infrastructure.opendatahub.io/v1',
        kind: 'HardwareProfile',
        metadata: {
          name: 'default-profile',
          namespace: 'redhat-ods-applications',
          annotations: { 'opendatahub.io/display-name': 'default-profile' },
        },
        spec: {
          identifiers: [
            { displayName: 'GPU', identifier: 'nvidia.com/gpu', resourceType: 'Accelerator' },
          ],
        },
      };
      const hardwareProfileByKey = new Map([
        ['redhat-ods-applications/default-profile', defaultProfileCr as never],
      ]);
      const statefulSetsByName = new Map([['umb-wkb', statefulSet]]);

      const row = mapWorkloadToRow(
        workload,
        NS,
        'DSP One',
        [],
        buildLocalQueueByName([localQueue(LQ, CQ)]),
        new Map(),
        CQ,
        hardwareProfileByKey,
        statefulSetsByName,
      );

      expect(row.type).toBe(QuotaUsageWorkloadTypes.Workbench);
      expect(row.hardwareProfile).toBe('default-profile');
      expect(row.hardwareProfileResourceType).toBe('nvidia.com/gpu');
    });

    it('collects HardwareProfile refs from StatefulSet pod templates', () => {
      const refs = collectHardwareProfileRefs([
        {
          namespace: NS,
          workloads: [],
          localQueues: [],
          pods: [],
          statefulSets: [
            {
              apiVersion: 'apps/v1',
              kind: 'StatefulSet',
              metadata: { name: 'hrathina-test-checkpointing', namespace: NS },
              spec: {
                template: {
                  metadata: {
                    annotations: {
                      'opendatahub.io/hardware-profile-name': 'default-profile',
                      'opendatahub.io/hardware-profile-namespace': 'redhat-ods-applications',
                    },
                  },
                },
              },
            },
          ],
          inferenceServices: [],
          jobKindByUid: new Map(),
        },
      ]);
      expect(refs).toEqual([{ name: 'default-profile', namespace: 'redhat-ods-applications' }]);
    });
  });
});
