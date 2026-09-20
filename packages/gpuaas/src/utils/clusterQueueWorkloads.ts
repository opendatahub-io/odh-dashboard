import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  type HardwareProfileKind,
  type K8sResourceCommon,
  type LocalQueueKind,
  type PodKind,
  type ProjectKind,
  WorkloadOwnerType,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { listAllLocalQueues, listLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import {
  getHardwareProfile,
  listHardwareProfiles,
} from '@odh-dashboard/internal/api/k8s/hardwareProfiles';
import { listInferenceService } from '@odh-dashboard/internal/api/k8s/inferenceServices';
import { getPendingWorkloads } from '@odh-dashboard/internal/api/k8s/pendingWorkloads';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { PodModel, StatefulSetModel } from '@odh-dashboard/internal/api/models';
import { RayJobModel, TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import {
  getKueueWorkloadStatusWithMessage,
  KUEUE_QUEUE_LABEL,
} from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import {
  buildHardwareProfileKey,
  getHardwareProfileRefFromAnnotations,
  getHardwareProfileRefFromPod,
  type HardwareProfileByKey,
  type HardwareProfileRef,
} from './hardwareModels';
import { resolveWorkloadHardwareProfileForRow } from './workloadHardwareProfileResolver';
import { isAcceleratorResource } from './clusterQueueUtils';
import parseK8sQuantity from './parseK8sQuantity';
import type { WorkloadInferenceService } from '../types/inferenceService';
import {
  type ClusterQueueWorkloadRow,
  QUOTA_USAGE_STATUSES_PAST_ADMISSION,
  QUOTA_USAGE_STATUSES_WITH_QUEUE_POSITION,
  QuotaUsageWorkloadStatuses,
  QuotaUsageWorkloadTypes,
  type QuotaUsageWorkloadStatus,
  type QuotaUsageWorkloadType,
} from '../types';

const EMPTY_INFERENCE_SERVICES: WorkloadInferenceService[] = [];

const NOTEBOOK_OWNER_KINDS = new Set(['job', 'statefulset', 'notebook', 'pod']);

const KUEUE_JOB_NAME_LABEL = 'kueue.x-k8s.io/job-name';
const KUEUE_JOB_UID_LABEL = 'kueue.x-k8s.io/job-uid';
const KUEUE_JOB_OWNER_NAME_ANNOTATION = 'kueue.x-k8s.io/job-owner-name';
const KUEUE_JOB_OWNER_GVK_ANNOTATION = 'kueue.x-k8s.io/job-owner-gvk';
const KUEUE_POD_GROUP_NAME_LABEL = 'kueue.x-k8s.io/pod-group-name';

/** Mirrors UnifiedJobKind.kind on the model training page (TrainJob | RayJob). */
export type WorkloadJobKind = 'RayJob' | 'TrainJob';

export type NamespaceWorkloadBaseData = {
  namespace: string;
  workloads: WorkloadKind[];
  localQueues: LocalQueueKind[];
};

export type NamespaceWorkloadData = NamespaceWorkloadBaseData & {
  pods: PodKind[];
  /** Workbench StatefulSets; pod template carries hardware-profile annotations when the notebook is stopped. */
  statefulSets: K8sResourceCommon[];
  /** KServe InferenceServices in the namespace (Model Serving hardware-profile source). */
  inferenceServices: WorkloadInferenceService[];
  /** job-uid label → job CR kind; used to classify Job-owned Kueue workloads as Train (TrainJob/RayJob). */
  jobKindByUid: Map<string, WorkloadJobKind>;
};

export const emptyNamespaceEnrichment = (): Pick<
  NamespaceWorkloadData,
  'pods' | 'statefulSets' | 'inferenceServices' | 'jobKindByUid'
> => ({
  pods: [],
  statefulSets: [],
  inferenceServices: [],
  jobKindByUid: new Map(),
});

export const toNamespaceWorkloadData = (
  base: NamespaceWorkloadBaseData,
  enrichment: Pick<
    NamespaceWorkloadData,
    'pods' | 'statefulSets' | 'inferenceServices' | 'jobKindByUid'
  > = emptyNamespaceEnrichment(),
): NamespaceWorkloadData => ({
  ...base,
  ...enrichment,
});

/** HardwareProfile CRs referenced by workload Pods, keyed by `${namespace}/${name}`. */
export type { HardwareProfileByKey } from './hardwareModels';

export type KueueNamespaceWorkloadCache = {
  namespaceData: NamespaceWorkloadData[];
  hardwareProfileByKey: HardwareProfileByKey;
  /** All HardwareProfile CRs used for resource-based matching (global + project namespaces). */
  hardwareProfilesForMatching: HardwareProfileKind[];
  /** Set when one or more namespace bundle fetches failed but other namespaces may still have loaded. */
  namespaceLoadError?: Error;
};

/**
 * Collects distinct HardwareProfile refs referenced by workload-related annotations.
 *
 * Pending workloads may carry the profile annotation only on the Workload pod-set template, before
 * a Pod or owning StatefulSet exists, so those annotations must be included here as well.
 */
export const collectHardwareProfileRefs = (
  namespaceData: NamespaceWorkloadData[],
): HardwareProfileRef[] => {
  const refsByKey = new Map<string, HardwareProfileRef>();
  for (const { workloads, pods, statefulSets, inferenceServices } of namespaceData) {
    for (const workload of workloads) {
      for (const podSet of workload.spec.podSets) {
        const ref = getHardwareProfileRefFromAnnotations(podSet.template.metadata?.annotations);
        if (ref) {
          refsByKey.set(buildHardwareProfileKey(ref), ref);
        }
      }
    }
    for (const pod of pods) {
      const ref = getHardwareProfileRefFromPod(pod);
      if (ref) {
        refsByKey.set(buildHardwareProfileKey(ref), ref);
      }
    }
    for (const statefulSet of statefulSets) {
      const ref = getHardwareProfileRefFromAnnotations(getPodTemplateAnnotations(statefulSet));
      if (ref) {
        refsByKey.set(buildHardwareProfileKey(ref), ref);
      }
    }
    for (const inferenceService of inferenceServices) {
      const ref = getHardwareProfileRefFromAnnotations(inferenceService.metadata?.annotations);
      if (ref) {
        refsByKey.set(buildHardwareProfileKey(ref), ref);
      }
    }
  }
  return [...refsByKey.values()];
};

/** Lists enabled HardwareProfile CRs from the dashboard namespace and each project namespace (for resource matching). */
export const fetchHardwareProfilesForMatching = async (
  namespaceData: NamespaceWorkloadData[],
  dashboardNamespace: string,
): Promise<HardwareProfileKind[]> => {
  const namespaces = new Set<string>();
  if (dashboardNamespace) {
    namespaces.add(dashboardNamespace);
  }
  for (const bundle of namespaceData) {
    namespaces.add(bundle.namespace);
  }
  for (const ref of collectHardwareProfileRefs(namespaceData)) {
    namespaces.add(ref.namespace);
  }

  const profileLists = await Promise.all(
    [...namespaces].map(async (namespace) => {
      try {
        return await listHardwareProfiles(namespace);
      } catch {
        // Hardware-profile matching is optional enrichment; one inaccessible namespace should not
        // prevent workload rows from rendering with an unavailable profile value.
        return [];
      }
    }),
  );

  const profilesByKey = new Map<string, HardwareProfileKind>();
  for (const hardwareProfile of profileLists.flat()) {
    profilesByKey.set(
      `${hardwareProfile.metadata.namespace}/${hardwareProfile.metadata.name}`,
      hardwareProfile,
    );
  }
  return [...profilesByKey.values()];
};

/** Fetches the given HardwareProfile CRs, keyed by `${namespace}/${name}`. Missing/denied refs are skipped. */
export const fetchHardwareProfilesByKey = async (
  refs: HardwareProfileRef[],
): Promise<HardwareProfileByKey> => {
  const entries = await Promise.all(
    refs.map(async (ref) => {
      try {
        const hardwareProfile = await getHardwareProfile(ref.name, ref.namespace);
        return [buildHardwareProfileKey(ref), hardwareProfile] as const;
      } catch {
        return undefined;
      }
    }),
  );

  return new Map(entries.filter((entry): entry is [string, HardwareProfileKind] => entry != null));
};

export const listPods = async (namespace: string): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: { ns: namespace },
  }).then((response) => response.items);

export const listStatefulSets = async (namespace: string): Promise<K8sResourceCommon[]> =>
  k8sListResource<K8sResourceCommon>({
    model: StatefulSetModel,
    queryOptions: { ns: namespace },
  }).then((response) => response.items);

export const listNamespaceInferenceServices = async (
  namespace: string,
): Promise<WorkloadInferenceService[]> =>
  listInferenceService(namespace).catch(() => EMPTY_INFERENCE_SERVICES);

const buildInferenceServicesByName = (
  inferenceServices: WorkloadInferenceService[],
): Map<string, WorkloadInferenceService> =>
  new Map(
    inferenceServices.flatMap((inferenceService) => {
      const name = inferenceService.metadata?.name;
      return name ? [[name, inferenceService] as const] : [];
    }),
  );

const KSERVE_INFERENCE_SERVICE_LABEL = 'serving.kserve.io/inferenceservice';
const LLMIS_POD_COMPONENT_LABEL = 'app.kubernetes.io/component';
const LLMIS_POD_COMPONENT_VALUE = 'llminferenceservice-workload';

/** Dedupes pods by UID (last write wins). */
export const mergePodsByUid = (podLists: PodKind[][]): PodKind[] => {
  const podByUid = new Map<string, PodKind>();
  for (const pods of podLists) {
    for (const pod of pods) {
      const { uid } = pod.metadata;
      if (uid) {
        podByUid.set(uid, pod);
      }
    }
  }
  return [...podByUid.values()];
};

/**
 * KServe / LLMIS predictor pods for Plain-Pod and ReplicaSet serving integrations.
 * Pod-group label fetch misses these; needed for Serve type + hardware profile resolution.
 */
export const listServingPodsInNamespace = async (namespace: string): Promise<PodKind[]> => {
  const [kservePods, llmisPods] = await Promise.all([
    k8sListResource<PodKind>({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: KSERVE_INFERENCE_SERVICE_LABEL },
      },
    })
      .then((response) => response.items)
      .catch(() => []),
    k8sListResource<PodKind>({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: {
          labelSelector: `${LLMIS_POD_COMPONENT_LABEL}=${LLMIS_POD_COMPONENT_VALUE}`,
        },
      },
    })
      .then((response) => response.items)
      .catch(() => []),
  ]);

  return mergePodsByUid([kservePods, llmisPods]);
};

/** Resolves the KServe InferenceService name from serving Pods owned by this Workload. */
export const resolveInferenceServiceNameForWorkload = (
  workload: WorkloadKind,
  pods: PodKind[],
): string | undefined => {
  for (const pod of findWorkloadPods(workload, pods)) {
    const inferenceServiceName = pod.metadata.labels?.[KSERVE_INFERENCE_SERVICE_LABEL];
    if (inferenceServiceName) {
      return inferenceServiceName;
    }
  }
  return undefined;
};

/** Minimal shape for owners (StatefulSet, etc.) whose pod template may carry hardware-profile annotations. */
type PodTemplateOwner = K8sResourceCommon & {
  spec: {
    template?: {
      metadata?: {
        annotations?: Record<string, string>;
      };
    };
  };
};

const isPodTemplateOwner = (owner: K8sResourceCommon | undefined): owner is PodTemplateOwner =>
  owner != null && typeof owner.spec === 'object' && 'template' in owner.spec;

const getPodTemplateAnnotations = (
  owner: K8sResourceCommon | undefined,
): Record<string, string> | undefined => {
  if (!isPodTemplateOwner(owner)) {
    return undefined;
  }
  return owner.spec.template?.metadata?.annotations;
};

const buildStatefulSetsByName = (
  statefulSets: K8sResourceCommon[],
): Map<string, K8sResourceCommon> =>
  new Map(
    statefulSets.flatMap((statefulSet) => {
      const name = statefulSet.metadata?.name;
      return name ? [[name, statefulSet] as const] : [];
    }),
  );

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

/** Fast path: Workloads + LocalQueues only (table can render before enrichment). */
export const fetchNamespaceWorkloadBaseData = async (
  namespace: string,
): Promise<NamespaceWorkloadBaseData> => {
  const [workloads, localQueues] = await Promise.all([
    listWorkloads(namespace),
    listLocalQueues(namespace),
  ]);
  return { namespace, workloads, localQueues };
};

/** Cluster-scoped LocalQueue → ClusterQueue index, keyed by cluster queue name to the set of namespaces with a LocalQueue targeting it. */
export type LocalQueueClusterQueueIndex = Map<string, Set<string>>;

/**
 * Fetches all LocalQueues cluster-wide in a single API call and builds an index of
 * clusterQueueName -> Set<namespace>. Used to scope namespace workload fetches to only the
 * namespaces relevant to the selected cluster queue(s), instead of fetching every Kueue-managed
 * namespace up front.
 */
export const fetchLocalQueueClusterQueueIndex = async (): Promise<LocalQueueClusterQueueIndex> => {
  const localQueues = await listAllLocalQueues();
  const index: LocalQueueClusterQueueIndex = new Map();

  for (const localQueue of localQueues) {
    const clusterQueueName = localQueue.spec.clusterQueue;
    const namespace = localQueue.metadata?.namespace;
    if (!clusterQueueName || !namespace) {
      continue;
    }

    const namespaces = index.get(clusterQueueName) ?? new Set<string>();
    namespaces.add(namespace);
    index.set(clusterQueueName, namespaces);
  }

  return index;
};

/** Union of namespaces (from the LocalQueue index) relevant to any of the given cluster queues. */
export const getNamespacesForClusterQueues = (
  clusterQueueNames: string[],
  index: LocalQueueClusterQueueIndex,
): Set<string> => {
  const namespaces = new Set<string>();
  for (const clusterQueueName of clusterQueueNames) {
    for (const namespace of index.get(clusterQueueName) ?? []) {
      namespaces.add(namespace);
    }
  }
  return namespaces;
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

  return findStatefulSetOwnerName(workload) != null;
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

const parseKueueJobOwnerKind = (ownerGvk: string): string | undefined => {
  const match = ownerGvk.match(/Kind=([^,\s]+)/i);
  return match?.[1];
};

/**
 * StatefulSet-backed group workloads (e.g. ODH workbenches) may omit ownerReferences on the
 * Workload CR and instead stamp `kueue.x-k8s.io/job-owner-name` / `job-owner-gvk`.
 */
const findStatefulSetOwnerName = (workload: WorkloadKind): string | undefined => {
  const statefulSetRef = findOwnerRefByKind(workload, WorkloadOwnerType.StatefulSet);
  if (statefulSetRef?.name) {
    return statefulSetRef.name;
  }

  const ownerName = workload.metadata?.annotations?.[KUEUE_JOB_OWNER_NAME_ANNOTATION]?.trim();
  const ownerGvk = workload.metadata?.annotations?.[KUEUE_JOB_OWNER_GVK_ANNOTATION];
  if (!ownerName || !ownerGvk) {
    return undefined;
  }

  const ownerKind = parseKueueJobOwnerKind(ownerGvk);
  if (ownerKind?.toLowerCase() !== WorkloadOwnerType.StatefulSet.toLowerCase()) {
    return undefined;
  }

  return ownerName;
};

const findPodsOwnedBy = (pods: PodKind[], ownerUid: string): PodKind[] =>
  pods.filter((pod) =>
    (pod.metadata.ownerReferences ?? []).some((ownerRef) => ownerRef.uid === ownerUid),
  );

/** Multi-pod pod-groups (e.g. StatefulSet/Job-based notebooks and training jobs) label each Pod with the owning Workload's name. */
const findPodsByGroupName = (pods: PodKind[], workloadName: string): PodKind[] =>
  pods.filter((pod) => pod.metadata.labels?.[KUEUE_POD_GROUP_NAME_LABEL] === workloadName);

/**
 * Resolves the Pod(s) belonging to a workload, across pod-group (grouped, e.g. notebooks/training
 * jobs) and single-pod (serving) shapes. Used to read dashboard-stamped Pod annotations (e.g. the
 * hardware profile annotation) for a given Kueue Workload.
 */
export const findWorkloadPods = (workload: WorkloadKind, pods: PodKind[]): PodKind[] => {
  const workloadName = workload.metadata?.name;
  const groupPods = workloadName ? findPodsByGroupName(pods, workloadName) : [];
  if (groupPods.length > 0) {
    return groupPods;
  }
  return findServingWorkloadPods(workload, pods);
};

/**
 * Annotation sources for hardware-profile resolution: running Pods first, then the owning
 * StatefulSet pod template (stopped workbenches), then the Workload podSet template.
 */
export const getWorkloadHardwareProfileAnnotationSources = (
  workload: WorkloadKind,
  pods: PodKind[],
  statefulSetsByName: Map<string, K8sResourceCommon>,
): Array<Record<string, string> | undefined> => {
  const sources = findWorkloadPods(workload, pods).map((pod) => pod.metadata.annotations);

  const statefulSetOwnerName = findStatefulSetOwnerName(workload);
  if (statefulSetOwnerName) {
    const statefulSet = statefulSetsByName.get(statefulSetOwnerName);
    sources.push(getPodTemplateAnnotations(statefulSet));
  }

  for (const podSet of workload.spec.podSets) {
    sources.push(podSet.template.metadata?.annotations);
  }

  return sources;
};

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
 * Local queue for Visibility API — same source as workbench/model-serving Kueue status:
 * `kueue.x-k8s.io/queue-name` on owner (StatefulSet / InferenceService) or Pod, then workload spec.
 */
export const resolveWorkloadLocalQueueName = (
  workload: WorkloadKind,
  pods: PodKind[],
  statefulSetsByName: Map<string, K8sResourceCommon>,
  inferenceServicesByName: Map<string, WorkloadInferenceService>,
): string => {
  const statefulSetOwnerName = findStatefulSetOwnerName(workload);
  if (statefulSetOwnerName) {
    const queueFromStatefulSet =
      statefulSetsByName.get(statefulSetOwnerName)?.metadata?.labels?.[KUEUE_QUEUE_LABEL];
    if (queueFromStatefulSet) {
      return queueFromStatefulSet;
    }
  }

  const inferenceServiceName = resolveInferenceServiceNameForWorkload(workload, pods);
  if (inferenceServiceName) {
    const queueFromInferenceService =
      inferenceServicesByName.get(inferenceServiceName)?.metadata?.labels?.[KUEUE_QUEUE_LABEL];
    if (queueFromInferenceService) {
      return queueFromInferenceService;
    }
  }

  for (const pod of findWorkloadPods(workload, pods)) {
    const queueFromPod = pod.metadata.labels?.[KUEUE_QUEUE_LABEL];
    if (queueFromPod) {
      return queueFromPod;
    }
  }

  return workload.spec.queueName?.trim() ?? '';
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
  if (jobKind === 'RayJob' || jobKind === 'TrainJob') {
    return QuotaUsageWorkloadTypes.Train;
  }

  if (isTrainingJobWorkload(workload)) {
    return QuotaUsageWorkloadTypes.Batch;
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

/** UXD status from Kueue Workload CR conditions only (no pod/runtime overlay). */
export const resolveQuotaUsageWorkloadStatus = (
  workload: WorkloadKind,
): QuotaUsageWorkloadStatus => {
  const { status: kueueStatus } = getKueueWorkloadStatusWithMessage(workload);
  return mapKueueStatusToQuotaUsageStatus(kueueStatus);
};

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

const getStatefulSet = async (
  namespace: string,
  name: string,
): Promise<K8sResourceCommon | undefined> => {
  try {
    return await k8sGetResource<K8sResourceCommon>({
      model: StatefulSetModel,
      queryOptions: { ns: namespace, name },
    });
  } catch {
    return undefined;
  }
};

const fetchStatefulSetsByName = async (
  namespace: string,
  names: Iterable<string>,
): Promise<K8sResourceCommon[]> => {
  const results = await Promise.all(
    [...names].map(async (name) => getStatefulSet(namespace, name)),
  );
  return results.filter((statefulSet): statefulSet is K8sResourceCommon => statefulSet != null);
};

const listPodsForWorkloadGroups = async (
  namespace: string,
  workloadNames: string[],
): Promise<PodKind[]> => {
  if (workloadNames.length === 0) {
    return [];
  }

  const labelSelector = `${KUEUE_POD_GROUP_NAME_LABEL} in (${workloadNames.join(',')})`;
  const response = await k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: { ns: namespace, queryParams: { labelSelector } },
  });
  return response.items;
};

const getGpuWorkloadsForClusterQueues = (
  workloads: WorkloadKind[],
  localQueues: LocalQueueKind[],
  clusterQueueNames: string[],
): WorkloadKind[] => {
  const localQueueByName = buildLocalQueueByName(localQueues);
  return workloads.filter(
    (workload) =>
      isGpuAwareWorkload(workload) &&
      clusterQueueNames.some((clusterQueueName) =>
        workloadMatchesClusterQueue(workload, clusterQueueName, localQueueByName),
      ),
  );
};

const getGpuWorkloadsInNamespace = (workloads: WorkloadKind[]): WorkloadKind[] =>
  workloads.filter(isGpuAwareWorkload);

const collectEnrichmentTargets = (
  workloads: WorkloadKind[],
): {
  statefulSetNames: Set<string>;
  workloadNames: string[];
  needsInferenceServices: boolean;
  needsJobKindByUid: boolean;
} => {
  const statefulSetNames = new Set<string>();
  const workloadNames: string[] = [];
  let needsInferenceServices = false;
  let needsJobKindByUid = false;

  for (const workload of workloads) {
    const statefulSetOwnerName = findStatefulSetOwnerName(workload);
    if (statefulSetOwnerName) {
      statefulSetNames.add(statefulSetOwnerName);
    }

    const workloadName = workload.metadata?.name;
    if (workloadName) {
      workloadNames.push(workloadName);
    }

    if (
      hasOwnerKind(workload, WorkloadOwnerType.ReplicaSet) ||
      hasOwnerKind(workload, WorkloadOwnerType.LeaderWorkerSet) ||
      findOwnerRefByKind(workload, 'pod')
    ) {
      needsInferenceServices = true;
    }

    if (workload.metadata?.labels?.[KUEUE_JOB_UID_LABEL] && !getWorkloadJobKind(workload)) {
      needsJobKindByUid = true;
    }
  }

  return { statefulSetNames, workloadNames, needsInferenceServices, needsJobKindByUid };
};

/**
 * Fetches pods, owner StatefulSets, InferenceServices, and job-kind index only for workloads
 * relevant to the selected cluster queue(s). Skips all enrichment API calls when the namespace
 * has no GPU workloads in those queues.
 */
export const enrichNamespaceWorkloadData = async (
  base: NamespaceWorkloadBaseData,
  clusterQueueNames: string[],
): Promise<NamespaceWorkloadData> => {
  const relevantWorkloads = getGpuWorkloadsForClusterQueues(
    base.workloads,
    base.localQueues,
    clusterQueueNames,
  );

  if (relevantWorkloads.length === 0) {
    return toNamespaceWorkloadData(base);
  }

  const { statefulSetNames, workloadNames, needsInferenceServices, needsJobKindByUid } =
    collectEnrichmentTargets(relevantWorkloads);

  const [groupPods, servingPods, statefulSets, inferenceServices, jobKindByUid] = await Promise.all(
    [
      listPodsForWorkloadGroups(base.namespace, workloadNames),
      needsInferenceServices ? listServingPodsInNamespace(base.namespace) : Promise.resolve([]),
      fetchStatefulSetsByName(base.namespace, statefulSetNames),
      needsInferenceServices
        ? listNamespaceInferenceServices(base.namespace)
        : Promise.resolve(EMPTY_INFERENCE_SERVICES),
      needsJobKindByUid ? buildJobKindByUid(base.namespace) : Promise.resolve(new Map()),
    ],
  );

  return toNamespaceWorkloadData(base, {
    pods: mergePodsByUid([groupPods, servingPods]),
    statefulSets,
    inferenceServices,
    jobKindByUid,
  });
};

/** Namespace-scoped tab: enrich all GPU workloads in the namespace. */
export const enrichNamespaceWorkloadDataForNamespace = async (
  base: NamespaceWorkloadBaseData,
): Promise<NamespaceWorkloadData> => {
  const relevantWorkloads = getGpuWorkloadsInNamespace(base.workloads);

  if (relevantWorkloads.length === 0) {
    return toNamespaceWorkloadData(base);
  }

  const { statefulSetNames, workloadNames, needsInferenceServices, needsJobKindByUid } =
    collectEnrichmentTargets(relevantWorkloads);

  const [groupPods, servingPods, statefulSets, inferenceServices, jobKindByUid] = await Promise.all(
    [
      listPodsForWorkloadGroups(base.namespace, workloadNames),
      needsInferenceServices ? listServingPodsInNamespace(base.namespace) : Promise.resolve([]),
      fetchStatefulSetsByName(base.namespace, statefulSetNames),
      needsInferenceServices
        ? listNamespaceInferenceServices(base.namespace)
        : Promise.resolve(EMPTY_INFERENCE_SERVICES),
      needsJobKindByUid ? buildJobKindByUid(base.namespace) : Promise.resolve(new Map()),
    ],
  );

  return toNamespaceWorkloadData(base, {
    pods: mergePodsByUid([groupPods, servingPods]),
    statefulSets,
    inferenceServices,
    jobKindByUid,
  });
};

export const fetchNamespaceWorkloadData = async (
  namespace: string,
): Promise<NamespaceWorkloadData> => {
  const base = await fetchNamespaceWorkloadBaseData(namespace);
  return enrichNamespaceWorkloadDataForNamespace(base);
};

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

/** Lowercase words from WorkloadPriorityClass metadata.name, e.g. "on-demand" → "on demand". */
export const formatPriorityClassLabel = (priorityClassName: string): string =>
  priorityClassName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .join(' ');

/** UXD format from Workload spec: "Critical (2000)" when both set; numeric priority alone as fallback. */
export const formatWorkloadPriority = (workload: WorkloadKind): string | undefined => {
  const priorityClassName = workload.spec.priorityClassRef?.name.trim();
  const { priority } = workload.spec;

  if (priorityClassName && priority != null) {
    return `${formatPriorityClassLabel(priorityClassName)} (${priority})`;
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
  jobKindByUid: ReadonlyMap<string, WorkloadJobKind> = new Map(),
  clusterQueueName?: string,
  hardwareProfileByKey: HardwareProfileByKey = new Map(),
  statefulSetsByName: Map<string, K8sResourceCommon> = new Map(),
  inferenceServicesByName: Map<string, WorkloadInferenceService> = new Map(),
  hardwareProfilesForMatching: HardwareProfileKind[] = [],
): ClusterQueueWorkloadRow => {
  const workloadType = resolveWorkloadType(workload, pods, jobKindByUid);
  const inferenceServiceName = resolveInferenceServiceNameForWorkload(workload, pods);
  const inferenceService = inferenceServiceName
    ? inferenceServicesByName.get(inferenceServiceName)
    : undefined;
  const status = resolveQuotaUsageWorkloadStatus(workload);
  const annotationSources = getWorkloadHardwareProfileAnnotationSources(
    workload,
    pods,
    statefulSetsByName,
  );
  if (inferenceService?.metadata?.annotations) {
    annotationSources.push(inferenceService.metadata.annotations);
  }
  const hardwareProfileInfo = resolveWorkloadHardwareProfileForRow(workload, {
    annotationSources,
    inferenceService,
    hardwareProfileByKey,
    hardwareProfilesForMatching,
    workloadType,
  });

  return {
    name: workload.metadata?.name ?? 'Unnamed',
    namespace,
    project: projectDisplayName,
    clusterQueue: clusterQueueName ?? resolveWorkloadClusterQueue(workload, localQueueByName),
    type: workloadType,
    status,
    localQueue: resolveWorkloadLocalQueueName(
      workload,
      pods,
      statefulSetsByName,
      inferenceServicesByName,
    ),
    accelerators: getWorkloadAcceleratorCount(workload),
    queuePosition: undefined,
    priority: formatWorkloadPriority(workload),
    hardwareProfile: hardwareProfileInfo?.displayName,
    hardwareProfileResourceType: hardwareProfileInfo?.acceleratorIdentifier,
  };
};

export const filterAndMapClusterQueueWorkloads = (
  clusterQueueName: string,
  namespaceData: NamespaceWorkloadData[],
  projectDisplayNames: Map<string, string>,
  hardwareProfileByKey: HardwareProfileByKey = new Map(),
  hardwareProfilesForMatching: HardwareProfileKind[] = [],
): ClusterQueueWorkloadRow[] =>
  namespaceData.flatMap(
    ({
      namespace,
      workloads,
      localQueues,
      pods,
      statefulSets,
      inferenceServices,
      jobKindByUid,
    }) => {
      const localQueueByName = buildLocalQueueByName(localQueues);
      const projectDisplayName = projectDisplayNames.get(namespace) ?? namespace;
      const statefulSetsByName = buildStatefulSetsByName(statefulSets);
      const inferenceServicesByName = buildInferenceServicesByName(inferenceServices);

      return workloads
        .filter(
          (workload) =>
            workloadMatchesClusterQueue(workload, clusterQueueName, localQueueByName) &&
            isQuotaUsageClusterQueueWorkload(workload, pods, localQueueByName),
        )
        .map((workload) =>
          mapWorkloadToRow(
            workload,
            namespace,
            projectDisplayName,
            pods,
            localQueueByName,
            jobKindByUid,
            clusterQueueName,
            hardwareProfileByKey,
            statefulSetsByName,
            inferenceServicesByName,
            hardwareProfilesForMatching,
          ),
        );
    },
  );

/** All workloads in a namespace, regardless of cluster queue. */
export const filterAndMapNamespaceWorkloads = (
  {
    namespace,
    workloads,
    localQueues,
    pods,
    statefulSets,
    inferenceServices,
    jobKindByUid,
  }: NamespaceWorkloadData,
  projectDisplayName: string,
  hardwareProfileByKey: HardwareProfileByKey = new Map(),
  hardwareProfilesForMatching: HardwareProfileKind[] = [],
): ClusterQueueWorkloadRow[] => {
  const localQueueByName = buildLocalQueueByName(localQueues);
  const statefulSetsByName = buildStatefulSetsByName(statefulSets);
  const inferenceServicesByName = buildInferenceServicesByName(inferenceServices);

  return workloads.map((workload) =>
    mapWorkloadToRow(
      workload,
      namespace,
      projectDisplayName,
      pods,
      localQueueByName,
      jobKindByUid,
      undefined,
      hardwareProfileByKey,
      statefulSetsByName,
      inferenceServicesByName,
      hardwareProfilesForMatching,
    ),
  );
};

export type QueuePositionKey = `${string}/${string}`;

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

/**
 * UXD display statuses: Kueue "Queued" without a visibility position → Pending;
 * with position → Queued. Other statuses are unchanged.
 */
export const applyDisplayStatuses = (rows: ClusterQueueWorkloadRow[]): ClusterQueueWorkloadRow[] =>
  rows.map((row) => {
    if (row.status !== QuotaUsageWorkloadStatuses.Queued) {
      return row;
    }
    if (row.queuePosition != null) {
      return row;
    }
    return { ...row, status: QuotaUsageWorkloadStatuses.Pending };
  });

/** Fetches workload-related K8s data for all Kueue-managed namespaces (shared cache for CQ filtering). */
export const fetchKueueNamespaceWorkloadCache = async (
  namespaces: string[],
  dashboardNamespace = '',
): Promise<KueueNamespaceWorkloadCache> => {
  if (namespaces.length === 0) {
    return {
      namespaceData: [],
      hardwareProfileByKey: new Map(),
      hardwareProfilesForMatching: [],
    };
  }

  const namespaceResults = await Promise.all(
    namespaces.map(async (namespace) => {
      try {
        return await fetchNamespaceWorkloadData(namespace);
      } catch {
        return undefined;
      }
    }),
  );

  const namespaceData = namespaceResults.filter(
    (result): result is NamespaceWorkloadData => result != null,
  );
  const [hardwareProfileByKey, hardwareProfilesForMatching] = await Promise.all([
    fetchHardwareProfilesByKey(collectHardwareProfileRefs(namespaceData)),
    fetchHardwareProfilesForMatching(namespaceData, dashboardNamespace),
  ]);

  return {
    namespaceData,
    hardwareProfileByKey,
    hardwareProfilesForMatching,
  };
};

/**
 * Maps cached namespace workload data to cluster-queue table rows, synchronously — no queue
 * position lookup. Lets the table render immediately; callers enrich with queue positions
 * separately (see `fetchQueuePositions` + `applyQueuePositionsToMap`) so Visibility API latency
 * does not block first paint.
 */
export const mapWorkloadsForClusterQueuesSync = (
  clusterQueueNames: string[],
  cache: KueueNamespaceWorkloadCache,
  projectDisplayNames: Map<string, string>,
): Map<string, ClusterQueueWorkloadRow[]> => {
  if (clusterQueueNames.length === 0) {
    return new Map();
  }

  const workloadsByClusterQueue = new Map<string, ClusterQueueWorkloadRow[]>();

  for (const clusterQueueName of clusterQueueNames) {
    workloadsByClusterQueue.set(
      clusterQueueName,
      filterAndMapClusterQueueWorkloads(
        clusterQueueName,
        cache.namespaceData,
        projectDisplayNames,
        cache.hardwareProfileByKey,
        cache.hardwareProfilesForMatching,
      ),
    );
  }

  return workloadsByClusterQueue;
};

/** Applies fetched queue positions (or an empty map, for the pre-enrichment render) and re-derives display statuses. */
export const applyQueuePositionsToMap = (
  workloadsByClusterQueue: Map<string, ClusterQueueWorkloadRow[]>,
  positions: Map<QueuePositionKey, number>,
  applyDisplayStatusConversion = true,
): Map<string, ClusterQueueWorkloadRow[]> => {
  const result = new Map<string, ClusterQueueWorkloadRow[]>();
  for (const [clusterQueueName, rows] of workloadsByClusterQueue) {
    const rowsWithPositions = applyQueuePositions(rows, positions);
    result.set(
      clusterQueueName,
      applyDisplayStatusConversion ? applyDisplayStatuses(rowsWithPositions) : rowsWithPositions,
    );
  }
  return result;
};

/** Maps cached namespace workload data to cluster-queue table rows (includes queue positions). */
export const mapWorkloadsForClusterQueues = async (
  clusterQueueNames: string[],
  cache: KueueNamespaceWorkloadCache,
  projectDisplayNames: Map<string, string>,
): Promise<Map<string, ClusterQueueWorkloadRow[]>> => {
  const workloadsByClusterQueue = mapWorkloadsForClusterQueuesSync(
    clusterQueueNames,
    cache,
    projectDisplayNames,
  );

  if (workloadsByClusterQueue.size === 0) {
    return workloadsByClusterQueue;
  }

  const allRows = [...workloadsByClusterQueue.values()].flat();
  const positions = await fetchQueuePositions(allRows);

  return applyQueuePositionsToMap(workloadsByClusterQueue, positions);
};

export const fetchWorkloadsForClusterQueues = async (
  clusterQueueNames: string[],
  namespaces: string[],
  projectDisplayNames: Map<string, string>,
): Promise<Map<string, ClusterQueueWorkloadRow[]>> => {
  if (namespaces.length === 0 || clusterQueueNames.length === 0) {
    return new Map();
  }

  const cache = await fetchKueueNamespaceWorkloadCache(namespaces);
  return mapWorkloadsForClusterQueues(clusterQueueNames, cache, projectDisplayNames);
};

export const fetchNamespaceWorkloads = async (
  namespace: string,
  projectDisplayName: string,
  dashboardNamespace = '',
): Promise<ClusterQueueWorkloadRow[]> => {
  if (!namespace) {
    return [];
  }

  const namespaceData = await fetchNamespaceWorkloadData(namespace);
  const [hardwareProfileByKey, hardwareProfilesForMatching] = await Promise.all([
    fetchHardwareProfilesByKey(collectHardwareProfileRefs([namespaceData])),
    fetchHardwareProfilesForMatching([namespaceData], dashboardNamespace),
  ]);
  const rows = filterAndMapNamespaceWorkloads(
    namespaceData,
    projectDisplayName,
    hardwareProfileByKey,
    hardwareProfilesForMatching,
  );
  const positions = await fetchQueuePositions(rows);
  return applyDisplayStatuses(applyQueuePositions(rows, positions));
};

export const fetchClusterQueueWorkloads = async (
  clusterQueueName: string,
  namespaces: string[],
  projectDisplayNames: Map<string, string>,
): Promise<ClusterQueueWorkloadRow[]> => {
  if (!clusterQueueName || namespaces.length === 0) {
    return [];
  }

  const workloadsByClusterQueue = await fetchWorkloadsForClusterQueues(
    [clusterQueueName],
    namespaces,
    projectDisplayNames,
  );

  return workloadsByClusterQueue.get(clusterQueueName) ?? [];
};
