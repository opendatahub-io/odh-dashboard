import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  type K8sResourceCommon,
  type LocalQueueKind,
  type PodKind,
  type ProjectKind,
  type ResourceFlavorKind,
  WorkloadOwnerType,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { listLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import { getPendingWorkloads } from '@odh-dashboard/internal/api/k8s/pendingWorkloads';
import { listResourceFlavors } from '@odh-dashboard/internal/api/k8s/resourceFlavors';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { PodModel } from '@odh-dashboard/internal/api/models';
import { RayJobModel, TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import {
  getKueueWorkloadStatusWithMessage,
  KUEUE_QUEUE_LABEL,
} from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { buildResourceFlavorByName, resolveWorkloadHardwareProfile } from './hardwareModels';
import { isAcceleratorResource } from './clusterQueueUtils';
import parseK8sQuantity from './parseK8sQuantity';
import {
  type ClusterQueueWorkloadRow,
  QUOTA_USAGE_STATUSES_PAST_ADMISSION,
  QUOTA_USAGE_STATUSES_WITH_QUEUE_POSITION,
  QuotaUsageWorkloadStatuses,
  QuotaUsageWorkloadTypes,
  type QuotaUsageWorkloadStatus,
  type QuotaUsageWorkloadType,
} from '../types';

const NOTEBOOK_OWNER_KINDS = new Set(['job', 'statefulset', 'notebook', 'pod']);

const KUEUE_JOB_NAME_LABEL = 'kueue.x-k8s.io/job-name';
const KUEUE_JOB_UID_LABEL = 'kueue.x-k8s.io/job-uid';

const TERMINAL_KUEUE_STATUSES = new Set([KueueWorkloadStatus.Complete, KueueWorkloadStatus.Failed]);

/** Mirrors UnifiedJobKind.kind on the model training page (TrainJob | RayJob). */
export type WorkloadJobKind = 'RayJob' | 'TrainJob';

export type NamespaceWorkloadData = {
  namespace: string;
  workloads: WorkloadKind[];
  localQueues: LocalQueueKind[];
  pods: PodKind[];
  /** job-uid label → job CR kind; used to classify Job-owned Kueue workloads as Train or Ray job. */
  jobKindByUid: Map<string, WorkloadJobKind>;
};

export const listPods = async (namespace: string): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: { ns: namespace },
  }).then((response) => response.items);

const addJobKindsToMap = (
  jobs: K8sResourceCommon[],
  kind: WorkloadJobKind,
  jobKindByUid: Map<string, WorkloadJobKind>,
): void => {
  for (const job of jobs) {
    const uid = job.metadata?.uid;
    if (uid) {
      jobKindByUid.set(uid, kind);
    }
  }
};

const buildJobKindByUid = async (namespace: string): Promise<Map<string, WorkloadJobKind>> => {
  const jobKindByUid = new Map<string, WorkloadJobKind>();

  await Promise.all([
    k8sListResource<K8sResourceCommon>({
      model: RayJobModel,
      queryOptions: { ns: namespace },
    })
      .then((response) => addJobKindsToMap(response.items, 'RayJob', jobKindByUid))
      .catch(() => {
        // RayJob CRD not installed or RBAC denied.
      }),
    k8sListResource<K8sResourceCommon>({
      model: TrainJobModel,
      queryOptions: { ns: namespace },
    })
      .then((response) => addJobKindsToMap(response.items, 'TrainJob', jobKindByUid))
      .catch(() => {
        // TrainJob CRD not installed or RBAC denied.
      }),
  ]);

  return jobKindByUid;
};

export const fetchNamespaceWorkloadData = async (
  namespace: string,
): Promise<NamespaceWorkloadData> => {
  const [workloads, localQueues, pods, jobKindByUid] = await Promise.all([
    listWorkloads(namespace),
    listLocalQueues(namespace),
    listPods(namespace),
    buildJobKindByUid(namespace),
  ]);

  return { namespace, workloads, localQueues, pods, jobKindByUid };
};

export const buildLocalQueueByName = (localQueues: LocalQueueKind[]): Map<string, LocalQueueKind> =>
  new Map(
    localQueues.flatMap((localQueue) => {
      const name = localQueue.metadata?.name;
      return name ? [[name, localQueue] as const] : [];
    }),
  );

/**
 * Includes admitted workloads on the cluster queue and pending workloads whose
 * LocalQueue targets the cluster queue (no admission yet).
 */
export const workloadMatchesClusterQueue = (
  workload: WorkloadKind,
  clusterQueueName: string,
  localQueueByName: Map<string, LocalQueueKind>,
): boolean => {
  const admittedClusterQueue = workload.status?.admission?.clusterQueue;
  if (admittedClusterQueue) {
    return admittedClusterQueue === clusterQueueName;
  }

  const localQueueName = workload.spec.queueName;
  if (!localQueueName) {
    return false;
  }

  return localQueueByName.get(localQueueName)?.spec.clusterQueue === clusterQueueName;
};

/**
 * Cluster-queue workloads table: only workloads actively managed by Kueue.
 * Auto-created Workload CRs for non-Kueue notebooks, RayClusters, or deployments
 * lack a local queue assignment and/or the queue-name label on the serving Pod.
 * Namespace-scoped workload tabs may use a different filter later.
 */
export const isKueueManagedWorkload = (
  workload: WorkloadKind,
  pods: PodKind[],
  localQueueByName: Map<string, LocalQueueKind>,
): boolean => {
  if (workload.spec.active === false) {
    return false;
  }

  const isAdmitted = Boolean(workload.status?.admission?.clusterQueue);
  const queueName = workload.spec.queueName?.trim();

  if (!isAdmitted && (!queueName || !localQueueByName.has(queueName))) {
    return false;
  }

  if (isServingWorkload(workload, pods)) {
    const servingPods = findServingWorkloadPods(workload, pods);
    if (servingPods.length === 0) {
      return false;
    }
    return servingPods.some((pod) => Boolean(pod.metadata.labels?.[KUEUE_QUEUE_LABEL]));
  }

  return true;
};

export const isQuotaUsageClusterQueueWorkload = (
  workload: WorkloadKind,
  pods: PodKind[],
  localQueueByName: Map<string, LocalQueueKind>,
): boolean =>
  isGpuAwareWorkload(workload) && isKueueManagedWorkload(workload, pods, localQueueByName);

export const isActiveWorkload = (workload: WorkloadKind): boolean => {
  const { status } = getKueueWorkloadStatusWithMessage(workload);
  return !TERMINAL_KUEUE_STATUSES.has(status);
};

/**
 * Notebook-style workbench workloads carry the job-name label and a supported owner ref.
 * Mirrors workloadMatchesNotebook in frontend/src/api/k8s/workloads.ts without a target name.
 */
export const isNotebookWorkload = (workload: WorkloadKind): boolean => {
  if (!workload.metadata?.labels?.[KUEUE_JOB_NAME_LABEL]) {
    return false;
  }

  return (workload.metadata.ownerReferences ?? []).some((ownerRef) =>
    NOTEBOOK_OWNER_KINDS.has(ownerRef.kind.toLowerCase()),
  );
};

/** Workbench: notebook job-name pattern or StatefulSet owner (ODH workbench integration). */
export const isWorkbenchWorkload = (workload: WorkloadKind): boolean => {
  if (isNotebookWorkload(workload)) {
    return true;
  }

  return (workload.metadata?.ownerReferences ?? []).some(
    (ownerRef) => ownerRef.kind.toLowerCase() === WorkloadOwnerType.StatefulSet.toLowerCase(),
  );
};

export const isRayClusterWorkload = (workload: WorkloadKind): boolean =>
  (workload.metadata?.ownerReferences ?? []).some(
    (ownerRef) => ownerRef.kind === WorkloadOwnerType.RayCluster,
  );

/**
 * Resolves the training job CR kind for a Kueue workload — same distinction as
 * `job.kind === 'TrainJob' | 'RayJob'` on the model training page.
 * Checks owner ref kind first, then kueue.x-k8s.io/job-uid against listed job CRs.
 */
export const getWorkloadJobKind = (
  workload: WorkloadKind,
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
): WorkloadJobKind | undefined => {
  for (const ownerRef of workload.metadata?.ownerReferences ?? []) {
    if (ownerRef.kind === 'RayJob') {
      return 'RayJob';
    }
    if (ownerRef.kind === 'TrainJob') {
      return 'TrainJob';
    }
  }

  const jobUid = workload.metadata?.labels?.[KUEUE_JOB_UID_LABEL];
  return jobUid ? jobKindByUid.get(jobUid) : undefined;
};

export const isRayJobWorkload = (
  workload: WorkloadKind,
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
): boolean => getWorkloadJobKind(workload, jobKindByUid) === 'RayJob';

export const isTrainJobWorkload = (
  workload: WorkloadKind,
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
): boolean => getWorkloadJobKind(workload, jobKindByUid) === 'TrainJob';

const isServingPod = (pod: PodKind): boolean => {
  const labels = pod.metadata.labels ?? {};
  if (labels['serving.kserve.io/inferenceservice']) {
    return true;
  }

  return (
    labels['app.kubernetes.io/component'] === 'llminferenceservice-workload' &&
    Boolean(labels['app.kubernetes.io/name'])
  );
};

const hasOwnerKind = (workload: WorkloadKind, kind: WorkloadOwnerType): boolean =>
  (workload.metadata?.ownerReferences ?? []).some((ownerRef) => ownerRef.kind === kind);

const findOwnerRefByKind = (workload: WorkloadKind, kind: string) =>
  (workload.metadata?.ownerReferences ?? []).find(
    (ownerRef) => ownerRef.kind.toLowerCase() === kind.toLowerCase(),
  );

const findPodsOwnedBy = (pods: PodKind[], ownerUid: string): PodKind[] =>
  pods.filter((pod) =>
    (pod.metadata.ownerReferences ?? []).some((ownerRef) => ownerRef.uid === ownerUid),
  );

/** Resolves serving Pods via direct Pod owner or descendant Pods for RS/LWS owners. */
const findServingWorkloadPods = (workload: WorkloadKind, pods: PodKind[]): PodKind[] => {
  const replicaSetRef = findOwnerRefByKind(workload, WorkloadOwnerType.ReplicaSet);
  if (replicaSetRef?.uid) {
    return findPodsOwnedBy(pods, replicaSetRef.uid);
  }

  const leaderWorkerSetRef = findOwnerRefByKind(workload, WorkloadOwnerType.LeaderWorkerSet);
  if (leaderWorkerSetRef?.uid) {
    return findPodsOwnedBy(pods, leaderWorkerSetRef.uid);
  }

  const podRef = findOwnerRefByKind(workload, 'pod');
  if (!podRef?.uid) {
    return [];
  }

  const pod = pods.find((candidate) => candidate.metadata.uid === podRef.uid);
  return pod ? [pod] : [];
};

/**
 * Model serving workloads: InferenceService / LLMInferenceService pods, ReplicaSet, or
 * LeaderWorkerSet owners. Pod label check uses single-hop Workload → Pod (see
 * buildWorkloadMapForDeployments in frontend for the full two-hop pattern).
 */
export const isServingWorkload = (workload: WorkloadKind, pods: PodKind[]): boolean => {
  if (
    hasOwnerKind(workload, WorkloadOwnerType.ReplicaSet) ||
    hasOwnerKind(workload, WorkloadOwnerType.LeaderWorkerSet)
  ) {
    return true;
  }

  const podRef = (workload.metadata?.ownerReferences ?? []).find(
    (ownerRef) => ownerRef.kind.toLowerCase() === 'pod',
  );
  if (!podRef?.uid) {
    return false;
  }

  const pod = pods.find((candidate) => candidate.metadata.uid === podRef.uid);
  if (!pod) {
    return false;
  }

  return isServingPod(pod);
};

/** Training jobs: Job owner that is not a notebook workbench (TrainJob, PyTorchJob, etc.). */
export const isTrainingJobWorkload = (workload: WorkloadKind): boolean =>
  hasOwnerKind(workload, WorkloadOwnerType.Job) && !isNotebookWorkload(workload);

export const resolveWorkloadType = (
  workload: WorkloadKind,
  pods: PodKind[],
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
): QuotaUsageWorkloadType => {
  if (isServingWorkload(workload, pods)) {
    return QuotaUsageWorkloadTypes.Serve;
  }
  if (isWorkbenchWorkload(workload)) {
    return QuotaUsageWorkloadTypes.Workbench;
  }
  if (isRayClusterWorkload(workload)) {
    return QuotaUsageWorkloadTypes.RayCluster;
  }

  const jobKind = getWorkloadJobKind(workload, jobKindByUid);
  if (jobKind === 'RayJob') {
    return QuotaUsageWorkloadTypes.RayJob;
  }
  if (jobKind === 'TrainJob') {
    return QuotaUsageWorkloadTypes.Train;
  }

  return QuotaUsageWorkloadTypes.Unknown;
};

const KUEUE_TO_QUOTA_USAGE_STATUS: Record<KueueWorkloadStatus, QuotaUsageWorkloadStatus> = {
  [KueueWorkloadStatus.Queued]: QuotaUsageWorkloadStatuses.Queued,
  [KueueWorkloadStatus.Failed]: QuotaUsageWorkloadStatuses.Failed,
  [KueueWorkloadStatus.Preempted]: QuotaUsageWorkloadStatuses.Preempted,
  [KueueWorkloadStatus.Evicted]: QuotaUsageWorkloadStatuses.Evicted,
  [KueueWorkloadStatus.Requeued]: QuotaUsageWorkloadStatuses.Requeued,
  [KueueWorkloadStatus.Inadmissible]: QuotaUsageWorkloadStatuses.Inadmissible,
  [KueueWorkloadStatus.AdmissionCheck]: QuotaUsageWorkloadStatuses.AdmissionCheck,
  [KueueWorkloadStatus.BlockedOnPreemptionGates]:
    QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates,
  [KueueWorkloadStatus.Running]: QuotaUsageWorkloadStatuses.Running,
  [KueueWorkloadStatus.Admitted]: QuotaUsageWorkloadStatuses.Admitted,
  [KueueWorkloadStatus.Complete]: QuotaUsageWorkloadStatuses.Complete,
};

/** Maps each KueueWorkloadStatus to its UXD Quota usage table status (1:1). */
export const mapKueueStatusToQuotaUsageStatus = (
  kueueStatus: KueueWorkloadStatus,
): QuotaUsageWorkloadStatus => KUEUE_TO_QUOTA_USAGE_STATUS[kueueStatus];

export const getWorkloadAcceleratorCount = (workload: WorkloadKind): number =>
  workload.spec.podSets.reduce((podSetTotal, podSet) => {
    const perPod = podSet.template.spec.containers.reduce((containerTotal, container) => {
      const requests = container.resources?.requests ?? {};
      const limits = container.resources?.limits ?? {};
      const resourceNames = new Set([...Object.keys(requests), ...Object.keys(limits)]);

      const acceleratorCount = [...resourceNames].reduce((resourceTotal, name) => {
        if (!isAcceleratorResource(name)) {
          return resourceTotal;
        }
        const value = requests[name] ?? limits[name];
        return resourceTotal + parseK8sQuantity(value);
      }, 0);
      return containerTotal + acceleratorCount;
    }, 0);
    return podSetTotal + perPod * podSet.count;
  }, 0);

/** True when the workload requests at least one accelerator resource in podSet container resources. */
export const isGpuAwareWorkload = (workload: WorkloadKind): boolean =>
  getWorkloadAcceleratorCount(workload) > 0;

export const getProjectDisplayName = (project: ProjectKind): string =>
  project.metadata.annotations?.['openshift.io/display-name'] ?? project.metadata.name;

export const resolveWorkloadClusterQueue = (
  workload: WorkloadKind,
  localQueueByName: Map<string, LocalQueueKind>,
): string => {
  const admittedClusterQueue = workload.status?.admission?.clusterQueue;
  if (admittedClusterQueue) {
    return admittedClusterQueue;
  }

  const localQueueName = workload.spec.queueName;
  if (!localQueueName) {
    return '';
  }

  return localQueueByName.get(localQueueName)?.spec.clusterQueue ?? '';
};

export const formatWorkloadPriority = (workload: WorkloadKind): string | undefined => {
  const priorityClassName = workload.spec.priorityClassRef?.name;
  const { priority } = workload.spec;

  if (priorityClassName && priority != null) {
    return `${priorityClassName} (${priority})`;
  }
  if (priorityClassName) {
    return priorityClassName;
  }
  if (priority != null) {
    return String(priority);
  }
  return undefined;
};

export const mapWorkloadToRow = (
  workload: WorkloadKind,
  namespace: string,
  projectDisplayName: string,
  pods: PodKind[],
  localQueueByName: Map<string, LocalQueueKind>,
  resourceFlavorByName: Map<string, ResourceFlavorKind>,
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
  clusterQueueName?: string,
): ClusterQueueWorkloadRow => {
  const kueueStatus = getKueueWorkloadStatusWithMessage(workload);
  const status = mapKueueStatusToQuotaUsageStatus(kueueStatus.status);

  return {
    name: workload.metadata?.name ?? 'Unnamed',
    namespace,
    project: projectDisplayName,
    clusterQueue: clusterQueueName ?? resolveWorkloadClusterQueue(workload, localQueueByName),
    type: resolveWorkloadType(workload, pods, jobKindByUid),
    status,
    localQueue: workload.spec.queueName ?? '',
    accelerators: getWorkloadAcceleratorCount(workload),
    queuePosition: undefined,
    priority: formatWorkloadPriority(workload),
    hardwareProfile: resolveWorkloadHardwareProfile(workload, resourceFlavorByName),
  };
};

export const filterAndMapClusterQueueWorkloads = (
  clusterQueueName: string,
  namespaceData: NamespaceWorkloadData[],
  projectDisplayNames: Map<string, string>,
  resourceFlavorByName: Map<string, ResourceFlavorKind>,
  includeTerminal = false,
): ClusterQueueWorkloadRow[] =>
  namespaceData.flatMap(({ namespace, workloads, localQueues, pods, jobKindByUid }) => {
    const localQueueByName = buildLocalQueueByName(localQueues);
    const projectDisplayName = projectDisplayNames.get(namespace) ?? namespace;

    return workloads
      .filter(
        (workload) =>
          workloadMatchesClusterQueue(workload, clusterQueueName, localQueueByName) &&
          isQuotaUsageClusterQueueWorkload(workload, pods, localQueueByName) &&
          (includeTerminal || isActiveWorkload(workload)),
      )
      .map((workload) =>
        mapWorkloadToRow(
          workload,
          namespace,
          projectDisplayName,
          pods,
          localQueueByName,
          resourceFlavorByName,
          jobKindByUid,
          clusterQueueName,
        ),
      );
  });

/** All workloads in a namespace, regardless of cluster queue. */
export const filterAndMapNamespaceWorkloads = (
  { namespace, workloads, localQueues, pods, jobKindByUid }: NamespaceWorkloadData,
  projectDisplayName: string,
  resourceFlavorByName: Map<string, ResourceFlavorKind>,
  includeTerminal = false,
): ClusterQueueWorkloadRow[] => {
  const localQueueByName = buildLocalQueueByName(localQueues);

  return workloads
    .filter((workload) => includeTerminal || isActiveWorkload(workload))
    .map((workload) =>
      mapWorkloadToRow(
        workload,
        namespace,
        projectDisplayName,
        pods,
        localQueueByName,
        resourceFlavorByName,
        jobKindByUid,
      ),
    );
};

type QueuePositionKey = `${string}/${string}`;

export const buildQueuePositionKey = (namespace: string, workloadName: string): QueuePositionKey =>
  `${namespace}/${workloadName}`;

/**
 * Fetches queue positions for queued workloads via the Kueue Visibility API.
 * Returns 1-indexed positions keyed by namespace/workload name.
 * 403 and other errors are handled gracefully (no position, no error thrown).
 */
export const fetchQueuePositions = async (
  rows: ClusterQueueWorkloadRow[],
): Promise<Map<QueuePositionKey, number>> => {
  const positions = new Map<QueuePositionKey, number>();
  const workloadsByQueue = new Map<string, ClusterQueueWorkloadRow[]>();

  for (const row of rows) {
    if (!QUOTA_USAGE_STATUSES_WITH_QUEUE_POSITION.includes(row.status) || !row.localQueue) {
      continue;
    }
    const queueKey = `${row.namespace}/${row.localQueue}`;
    const existing = workloadsByQueue.get(queueKey) ?? [];
    existing.push(row);
    workloadsByQueue.set(queueKey, existing);
  }

  await Promise.all(
    Array.from(workloadsByQueue.entries()).map(async ([queueKey, queueRows]) => {
      const [namespace, localQueueName] = queueKey.split('/');
      try {
        const summary = await getPendingWorkloads(namespace, localQueueName);
        for (const row of queueRows) {
          const pendingWorkload = summary.items.find((item) => item.metadata.name === row.name);
          if (pendingWorkload != null) {
            positions.set(
              buildQueuePositionKey(namespace, row.name),
              pendingWorkload.positionInLocalQueue + 1,
            );
          }
        }
      } catch {
        // Visibility API RBAC denial or transient error — omit positions silently.
      }
    }),
  );

  return positions;
};

export const applyQueuePositions = (
  rows: ClusterQueueWorkloadRow[],
  positions: Map<QueuePositionKey, number>,
): ClusterQueueWorkloadRow[] =>
  rows.map((row) => {
    if (QUOTA_USAGE_STATUSES_PAST_ADMISSION.includes(row.status)) {
      return row;
    }

    const position = positions.get(buildQueuePositionKey(row.namespace, row.name));
    return position == null ? row : { ...row, queuePosition: position };
  });

export const fetchWorkloadsForClusterQueues = async (
  clusterQueueNames: string[],
  namespaces: string[],
  projectDisplayNames: Map<string, string>,
  includeTerminal = false,
): Promise<Map<string, ClusterQueueWorkloadRow[]>> => {
  if (namespaces.length === 0 || clusterQueueNames.length === 0) {
    return new Map();
  }

  const [namespaceResults, resourceFlavors] = await Promise.all([
    Promise.all(
      namespaces.map(async (namespace) => {
        try {
          return await fetchNamespaceWorkloadData(namespace);
        } catch {
          return undefined;
        }
      }),
    ),
    listResourceFlavors(),
  ]);
  const namespaceData = namespaceResults.filter(
    (result): result is NamespaceWorkloadData => result != null,
  );
  const resourceFlavorByName = buildResourceFlavorByName(resourceFlavors);
  const workloadsByClusterQueue = new Map<string, ClusterQueueWorkloadRow[]>();

  for (const clusterQueueName of clusterQueueNames) {
    workloadsByClusterQueue.set(
      clusterQueueName,
      filterAndMapClusterQueueWorkloads(
        clusterQueueName,
        namespaceData,
        projectDisplayNames,
        resourceFlavorByName,
        includeTerminal,
      ),
    );
  }

  const allRows = [...workloadsByClusterQueue.values()].flat();
  const positions = await fetchQueuePositions(allRows);

  for (const [clusterQueueName, rows] of workloadsByClusterQueue) {
    workloadsByClusterQueue.set(clusterQueueName, applyQueuePositions(rows, positions));
  }

  return workloadsByClusterQueue;
};

export const fetchNamespaceWorkloads = async (
  namespace: string,
  projectDisplayName: string,
  includeTerminal = false,
): Promise<ClusterQueueWorkloadRow[]> => {
  if (!namespace) {
    return [];
  }

  const [namespaceData, resourceFlavors] = await Promise.all([
    fetchNamespaceWorkloadData(namespace),
    listResourceFlavors(),
  ]);
  const resourceFlavorByName = buildResourceFlavorByName(resourceFlavors);
  const rows = filterAndMapNamespaceWorkloads(
    namespaceData,
    projectDisplayName,
    resourceFlavorByName,
    includeTerminal,
  );
  const positions = await fetchQueuePositions(rows);
  return applyQueuePositions(rows, positions);
};

export const fetchClusterQueueWorkloads = async (
  clusterQueueName: string,
  namespaces: string[],
  projectDisplayNames: Map<string, string>,
  includeTerminal = false,
): Promise<ClusterQueueWorkloadRow[]> => {
  if (!clusterQueueName || namespaces.length === 0) {
    return [];
  }

  const workloadsByClusterQueue = await fetchWorkloadsForClusterQueues(
    [clusterQueueName],
    namespaces,
    projectDisplayNames,
    includeTerminal,
  );

  return workloadsByClusterQueue.get(clusterQueueName) ?? [];
};
