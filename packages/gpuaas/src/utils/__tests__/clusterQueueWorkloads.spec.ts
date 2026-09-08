import type {
  LocalQueueKind,
  PodKind,
  ResourceFlavorKind,
  WorkloadCondition,
  WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { WorkloadOwnerType } from '@odh-dashboard/k8s-core';
import { getPendingWorkloads } from '@odh-dashboard/internal/api/k8s/pendingWorkloads';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import {
  applyQueuePositions,
  buildLocalQueueByName,
  fetchQueuePositions,
  filterAndMapClusterQueueWorkloads,
  filterAndMapNamespaceWorkloads,
  formatWorkloadPriority,
  isActiveWorkload,
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
  mapWorkloadToRow,
  resolveWorkloadClusterQueue,
  resolveWorkloadType,
  workloadMatchesClusterQueue,
} from '../clusterQueueWorkloads';

jest.mock('@odh-dashboard/internal/api/k8s/pendingWorkloads', () => ({
  getPendingWorkloads: jest.fn(),
}));

const getPendingWorkloadsMock = jest.mocked(getPendingWorkloads);

const NS = 'dsp-1';
const CQ = 'gpu-cq';
const LQ = 'user-queue';
const emptyResourceFlavors = new Map<string, ResourceFlavorKind>();

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

const makePod = (uid: string, labels: Record<string, string>): PodKind =>
  ({
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { name: `pod-${uid}`, namespace: NS, uid, labels },
    spec: {},
    status: { phase: 'Running' },
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

  describe('isActiveWorkload', () => {
    it('excludes complete workloads by default scope', () => {
      expect(isActiveWorkload(baseWorkload({ status: { conditions: completeConditions } }))).toBe(
        false,
      );
    });

    it('includes admitted active workloads', () => {
      expect(
        isActiveWorkload(
          baseWorkload({
            status: {
              admission: { clusterQueue: CQ, podSetAssignments: [] },
              conditions: admittedConditions,
            },
          }),
        ),
      ).toBe(true);
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

    it('resolves ray job workloads from RayJob owner', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rayjob-wl',
          namespace: NS,
          ownerReferences: [
            { apiVersion: 'ray.io/v1', kind: 'RayJob', name: 'ray-job', uid: 'rayjob-uid' },
          ],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.RayJob);
      expect(isRayJobWorkload(workload)).toBe(true);
    });

    it('resolves ray job workloads from job-uid label matching a RayJob CR', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'rayjob-wl',
          namespace: NS,
          labels: { 'kueue.x-k8s.io/job-uid': 'rayjob-cr-uid' },
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'ray-job', uid: 'job-uid' }],
        },
      });
      const jobKindByUid = new Map([['rayjob-cr-uid', 'RayJob' as const]]);
      expect(resolveWorkloadType(workload, [], jobKindByUid)).toBe(QuotaUsageWorkloadTypes.RayJob);
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

    it('classifies generic Job-owned workloads as unknown when not a TrainJob or RayJob', () => {
      const workload = baseWorkload({
        metadata: {
          name: 'batch-wl',
          namespace: NS,
          ownerReferences: [{ apiVersion: 'v1', kind: 'Job', name: 'batch-job', uid: 'job-uid' }],
        },
      });
      expect(resolveWorkloadType(workload, [])).toBe(QuotaUsageWorkloadTypes.Unknown);
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

    it('maps rows with accelerators and excludes terminal workloads by default', () => {
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

      const rows = filterAndMapClusterQueueWorkloads(
        CQ,
        [
          {
            namespace: NS,
            workloads: [admitted, queued, complete],
            localQueues: [localQueue(LQ, CQ)],
            pods: [],
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
        emptyResourceFlavors,
      );

      expect(rows).toHaveLength(2);
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
      expect(rows.some((row) => row.name === 'complete-wl')).toBe(false);
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
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
        emptyResourceFlavors,
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
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
        emptyResourceFlavors,
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
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
        emptyResourceFlavors,
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
            jobKindByUid: new Map(),
          },
        ],
        projectDisplayNames,
        emptyResourceFlavors,
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

  describe('mapWorkloadToRow', () => {
    it('maps priority and hardware profile from workload spec and admission', () => {
      const resourceFlavor: ResourceFlavorKind = {
        apiVersion: 'kueue.x-k8s.io/v1beta2',
        kind: 'ResourceFlavor',
        metadata: { name: 'gpu-l40s' },
        spec: { nodeLabels: { 'nvidia.com/gpu.product': 'NVIDIA-L40S' } },
      };
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
        new Map([['gpu-l40s', resourceFlavor]]),
        new Map(),
        CQ,
      );

      expect(row).toMatchObject({
        clusterQueue: CQ,
        priority: 'on-demand (100)',
        hardwareProfile: 'NVIDIA-L40S',
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
      ).toBe('on-demand (100)');
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
    it('maps all active workloads in a namespace regardless of cluster queue', () => {
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
          jobKindByUid: new Map(),
        },
        'DSP One',
        emptyResourceFlavors,
      );

      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.name)).toEqual(
        expect.arrayContaining(['admitted-wl', 'queued-wl']),
      );
    });
  });
});
