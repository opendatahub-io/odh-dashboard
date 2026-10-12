import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type {
  K8sResourceCommon,
  NotebookKind,
  PodKind,
  WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { aggregateKueueStatusForModel } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  getInferenceServiceModelState,
  type InferenceServiceKind,
  ModelDeploymentState,
} from '@odh-dashboard/model-serving/shared';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';
import {
  getLLMInferenceServiceModelState,
  getLLMdDeploymentConditions,
} from '@odh-dashboard/llmd-serving/status';
import { getKServeDeploymentConditions } from '@odh-dashboard/kserve/status';
import type { LLMInferenceServiceKind } from '@odh-dashboard/llmd-serving/types';
import {
  getRayJobStatusSync,
  getStatusInfo,
  getTrainingJobStatusSync,
} from '@odh-dashboard/model-training/status';
import type { RayJobKind, TrainJobKind } from '@odh-dashboard/model-training/k8sTypes';
import { RayJobState, TrainingJobState } from '@odh-dashboard/model-training/types';
import {
  NotebookModel,
  RayJobModel,
  TrainJobModel,
} from '@odh-dashboard/internal/api/models/kubeflow';
import { LLMInferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import { listInferenceService } from '@odh-dashboard/internal/api/k8s/inferenceServices';
import {
  buildWorkloadMapForDeployments,
  buildWorkloadMapForNotebooks,
  listWorkloads,
} from '@odh-dashboard/internal/api/k8s/workloads';
import { getHardwareProfile } from '@odh-dashboard/internal/api/k8s/hardwareProfiles';
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import { fetchNamespaceWorkloads } from './clusterQueueWorkloads';
import {
  buildHardwareProfileKey,
  getHardwareProfileRefFromAnnotations,
  resolveWorkloadHardwareProfileFromAnnotation,
  type HardwareProfileByKey,
} from './hardwareModels';
import {
  QUOTA_USAGE_TO_KUEUE_STATUS,
  QuotaUsageWorkloadStatuses,
  type ClusterQueueWorkloadRow,
} from '../types';
import { InfrastructureWorkloadKind } from '../types/infrastructureWorkloads';
import { INFRASTRUCTURE_WORKLOAD_NON_KUEUE_LABEL } from '../const';
import type {
  InfrastructureWorkloadRow,
  InfrastructureWorkloadResource,
  InfrastructureWorkloadStatus,
  InfrastructureKueueState,
  InfrastructureWorkloadType,
  InfrastructureWorkloadsFilterType,
  InfrastructureWorkloadsResult,
} from '../types/infrastructureWorkloads';

type SupportedResource = InfrastructureWorkloadResource;
type KueueWorkloadByResourceKey = Map<string, WorkloadKind[]>;

const KUEUE_STATUS_OPTIONS: KueueWorkloadStatus[] = [
  KueueWorkloadStatus.Queued,
  KueueWorkloadStatus.Admitted,
  KueueWorkloadStatus.Inadmissible,
  KueueWorkloadStatus.Preempted,
  KueueWorkloadStatus.Evicted,
  KueueWorkloadStatus.Requeued,
  KueueWorkloadStatus.AdmissionCheck,
  KueueWorkloadStatus.BlockedOnPreemptionGates,
  KueueWorkloadStatus.Running,
  KueueWorkloadStatus.Complete,
  KueueWorkloadStatus.Failed,
];

const MODEL_DEPLOYMENT_STATUS_LABELS: Record<ModelDeploymentState, string> = {
  [ModelDeploymentState.PENDING]: 'Starting',
  [ModelDeploymentState.STANDBY]: 'Starting',
  [ModelDeploymentState.FAILED_TO_LOAD]: 'Failed',
  [ModelDeploymentState.LOADING]: 'Starting',
  [ModelDeploymentState.LOADED]: 'Ready',
  [ModelDeploymentState.UNKNOWN]: 'Unknown',
};

type ResourceWithStatus = K8sResourceCommon & {
  status?: {
    conditions?: Array<{ type?: string; status?: string; reason?: string; message?: string }>;
    state?: string;
    phase?: string;
  };
};

/** Narrows a supported Infrastructure resource to a TrainJob. */
const isTrainJob = (resource: SupportedResource): resource is TrainJobKind =>
  resource.kind === InfrastructureWorkloadKind.TrainJob;

/** Narrows a supported Infrastructure resource to a RayJob. */
const isRayJob = (resource: SupportedResource): resource is RayJobKind =>
  resource.kind === InfrastructureWorkloadKind.RayJob;

/** Narrows a supported Infrastructure resource to an InferenceService. */
const isInferenceService = (resource: SupportedResource): resource is InferenceServiceKind =>
  resource.kind === InfrastructureWorkloadKind.InferenceService;

/** Narrows a supported Infrastructure resource to an LLMInferenceService. */
const isLLMInferenceService = (resource: SupportedResource): resource is LLMInferenceServiceKind =>
  resource.kind === InfrastructureWorkloadKind.LLMInferenceService;

/** Returns the failure message from a RayJob condition, when one is available. */
const getRayJobStatusMessage = (resource: ResourceWithStatus): string | undefined =>
  resource.status?.conditions?.find((condition) => condition.status === 'False')?.message;

/** Maps a workload status label to the PatternFly status variant used by the table. */
const getStatusVariant = (label: string): InfrastructureWorkloadStatus['variant'] => {
  if (label === 'Failed') {
    return 'danger';
  }
  if (['Ready', 'Running', 'Succeeded', 'Complete'].includes(label)) {
    return 'success';
  }
  if (['Pending', 'Queued', 'Starting'].includes(label)) {
    return 'info';
  }
  return 'custom';
};

/** Returns the supported Infrastructure kind, defaulting unknown resources to Notebook. */
const getInfrastructureWorkloadKind = (resource: SupportedResource): InfrastructureWorkloadKind => {
  switch (resource.kind) {
    case InfrastructureWorkloadKind.TrainJob:
    case InfrastructureWorkloadKind.RayJob:
    case InfrastructureWorkloadKind.InferenceService:
    case InfrastructureWorkloadKind.LLMInferenceService:
    case InfrastructureWorkloadKind.Notebook:
      return resource.kind;
    default:
      return InfrastructureWorkloadKind.Notebook;
  }
};

/** Converts a Kubernetes kind into the user-facing Infrastructure Workloads type label. */
const getInfrastructureWorkloadType = (kind: string): InfrastructureWorkloadType => {
  switch (kind) {
    case InfrastructureWorkloadKind.TrainJob:
      return 'Train job';
    case InfrastructureWorkloadKind.RayJob:
      return 'Ray job';
    case InfrastructureWorkloadKind.Notebook:
      return 'Workbench';
    default:
      return 'Inference';
  }
};

/** Formats a Kueue value according to whether Kueue data is managed, absent, or unavailable. */
export const formatInfrastructureWorkloadKueueValue = (
  value: string | undefined,
  kueueState: InfrastructureKueueState,
): string => {
  if (kueueState === 'unavailable') {
    return '--';
  }
  return kueueState === 'managed' ? value ?? '--' : INFRASTRUCTURE_WORKLOAD_NON_KUEUE_LABEL;
};

/** Resolves the per-row Kueue state from overall availability and resource correlation. */
const getInfrastructureKueueState = (
  kueueAvailabilityState: InfrastructureKueueState,
  kueueRow: ClusterQueueWorkloadRow | undefined,
): InfrastructureKueueState =>
  kueueAvailabilityState === 'unavailable' ? 'unavailable' : kueueRow ? 'managed' : 'non-kueue';

/** Converts a Cluster Queue row status into the Infrastructure Kueue status shape. */
const getKueueStatusFromRow = (
  kueueRow: ClusterQueueWorkloadRow | undefined,
): KueueWorkloadStatusWithMessage | null => {
  const status =
    kueueRow?.status === QuotaUsageWorkloadStatuses.Pending
      ? KueueWorkloadStatus.Queued
      : kueueRow && QUOTA_USAGE_TO_KUEUE_STATUS[kueueRow.status];

  return status ? { status } : null;
};

/** Converts a Notebook controller state into the status displayed for a workbench row. */
export const getInfrastructureWorkbenchStatus = (
  notebookState: import('@odh-dashboard/internal/pages/projects/notebook/types').NotebookState,
): InfrastructureWorkloadStatus => {
  if (notebookState.isStopping) {
    return { label: 'Stopping', variant: 'custom' };
  }
  if (notebookState.isStarting) {
    return { label: 'Starting', variant: 'info' };
  }
  if (notebookState.isRunning) {
    return { label: 'Ready', variant: 'success' };
  }
  return { label: 'Stopped', variant: 'custom' };
};

/** Builds the complete status-filter option list, including statuses not currently present. */
export const getInfrastructureWorkloadStatusOptions = (
  workloads: InfrastructureWorkloadRow[],
): SimpleSelectOption[] => {
  const statuses = new Set(
    workloads.flatMap(({ status, kueueStatus }) =>
      kueueStatus ? [status.label, kueueStatus] : [status.label],
    ),
  );

  // Keep the complete status menu available so users can choose a status before
  // a workload with that status is currently present in the table.
  KUEUE_STATUS_OPTIONS.forEach((status) => statuses.add(status));

  return [...statuses].toSorted().map((status) => ({
    key: status,
    label: status,
  }));
};

/** Returns the selectable values for the requested Infrastructure Workloads filter. */
export const getInfrastructureWorkloadFilterValues = (
  workloads: InfrastructureWorkloadRow[],
  filterType: InfrastructureWorkloadsFilterType,
): string[] => {
  if (filterType === 'status') {
    return getInfrastructureWorkloadStatusOptions(workloads).map((option) => option.key);
  }

  const values =
    filterType === 'type'
      ? workloads.map((workload) => workload.type)
      : workloads.flatMap((workload) =>
          workload.hardwareProfile ? [workload.hardwareProfile] : [],
        );

  return [...new Set(values)].toSorted();
};

/** Filters Infrastructure rows by name and the selected status, type, or Hardware Profile values. */
export const filterInfrastructureWorkloads = (
  workloads: InfrastructureWorkloadRow[],
  searchValue: string,
  filterType: InfrastructureWorkloadsFilterType,
  selectedFilterValues: string[],
): InfrastructureWorkloadRow[] => {
  const normalizedSearch = searchValue.trim().toLowerCase();
  return workloads.filter((workload) => {
    const matchesName = !normalizedSearch || workload.name.toLowerCase().includes(normalizedSearch);
    const filterValue =
      filterType === 'status'
        ? [workload.status.label, workload.kueueStatus]
        : filterType === 'type'
        ? workload.type
        : workload.hardwareProfile;
    const matchesFilter =
      selectedFilterValues.length === 0 ||
      (Array.isArray(filterValue)
        ? selectedFilterValues.some((value) => filterValue.includes(value))
        : filterValue !== undefined && selectedFilterValues.includes(filterValue));
    return matchesName && matchesFilter;
  });
};

/** Builds model-serving deployment status details for an Infrastructure Workloads row. */
const getInfrastructureModelDeploymentStatus = (
  resource: SupportedResource,
  kueueStatus: KueueWorkloadStatusWithMessage | null,
): InfrastructureWorkloadRow['deploymentStatus'] => {
  if (isInferenceService(resource)) {
    const state = getInferenceServiceModelState(resource);
    return {
      state,
      message: resource.status?.modelStatus?.lastFailureInfo?.message,
      conditions: getKServeDeploymentConditions(resource, state, kueueStatus),
      stoppedStates: getModelDeploymentStoppedStates(
        state,
        resource.metadata.annotations,
        undefined,
        kueueStatus,
      ),
      kueueStatus,
    };
  }

  if (isLLMInferenceService(resource)) {
    const state = getLLMInferenceServiceModelState(resource);
    return {
      state,
      message: resource.status?.conditions?.find((condition) => condition.type === 'Ready')
        ?.message,
      conditions: getLLMdDeploymentConditions(resource, kueueStatus),
      stoppedStates: getModelDeploymentStoppedStates(
        state,
        resource.metadata.annotations,
        undefined,
        kueueStatus,
      ),
      kueueStatus,
    };
  }

  return undefined;
};

/** Resolves the primary table status for a workload resource. */
const getInfrastructureWorkloadFilterStatus = (
  resource: SupportedResource,
  deploymentStatus?: InfrastructureWorkloadRow['deploymentStatus'],
): InfrastructureWorkloadStatus => {
  /** Creates a job status object using the shared label-to-variant mapping. */
  const getJobStatus = (label: string, message?: string): InfrastructureWorkloadStatus => ({
    label,
    message,
    variant: getStatusVariant(label),
  });

  const kind = getInfrastructureWorkloadKind(resource);
  switch (kind) {
    case InfrastructureWorkloadKind.TrainJob:
      if (isTrainJob(resource)) {
        const status = getTrainingJobStatusSync(resource);
        return getJobStatus(
          getStatusInfo(status).label,
          resource.status?.conditions?.find((condition) => condition.status === 'False')?.message,
        );
      }
      break;
    case InfrastructureWorkloadKind.RayJob:
      if (isRayJob(resource)) {
        const status = getRayJobStatusSync(resource);
        return getJobStatus(getStatusInfo(status).label, getRayJobStatusMessage(resource));
      }
      break;
    case InfrastructureWorkloadKind.InferenceService:
    case InfrastructureWorkloadKind.LLMInferenceService:
      if (isInferenceService(resource) || isLLMInferenceService(resource)) {
        const stoppedStates = getModelDeploymentStoppedStates(
          deploymentStatus?.state ?? ModelDeploymentState.UNKNOWN,
          resource.metadata.annotations,
        );
        if (stoppedStates.isStopped) {
          return { label: 'Stopped', variant: 'custom' };
        }
        if (!deploymentStatus) {
          return { label: 'Unknown', variant: 'custom' };
        }
        const label = MODEL_DEPLOYMENT_STATUS_LABELS[deploymentStatus.state];
        return {
          label,
          message: deploymentStatus.message,
          variant: getStatusVariant(label),
        };
      }
      break;
    case InfrastructureWorkloadKind.Notebook:
      break;
  }
  return { label: 'Unknown', variant: 'custom' };
};

/** Resolves the model-training status once for the Infrastructure row and its modal. */
const getInfrastructureJobStatus = (
  resource: SupportedResource,
  kueueStatus: KueueWorkloadStatusWithMessage | null,
): import('@odh-dashboard/model-training/types').JobDisplayState | undefined => {
  if (isTrainJob(resource)) {
    if (kueueStatus?.status === KueueWorkloadStatus.Queued) {
      return TrainingJobState.QUEUED;
    }
    if (kueueStatus?.status === KueueWorkloadStatus.Inadmissible) {
      return TrainingJobState.INADMISSIBLE;
    }
    return getTrainingJobStatusSync(resource);
  }

  if (isRayJob(resource)) {
    if (kueueStatus?.status === KueueWorkloadStatus.Queued) {
      return RayJobState.QUEUED;
    }
    if (kueueStatus?.status === KueueWorkloadStatus.Inadmissible) {
      return RayJobState.INADMISSIBLE;
    }
    return getRayJobStatusSync(resource);
  }

  return undefined;
};

/** Fetches referenced HardwareProfile CRs for Infrastructure resources, independent of Kueue data. */
const fetchInfrastructureHardwareProfiles = async (
  resources: SupportedResource[],
): Promise<HardwareProfileByKey> => {
  const refs = new Map(
    resources.flatMap((resource) => {
      const ref = getHardwareProfileRefFromAnnotations(resource.metadata.annotations);
      return ref ? [[buildHardwareProfileKey(ref), ref] as const] : [];
    }),
  );
  const entries = await Promise.all(
    [...refs.values()].map(async (ref) => {
      try {
        return [
          buildHardwareProfileKey(ref),
          await getHardwareProfile(ref.name, ref.namespace),
        ] as const;
      } catch {
        return undefined;
      }
    }),
  );
  return new Map(
    entries.filter((entry): entry is [string, NonNullable<typeof entry>[1]] => entry != null),
  );
};

/** Creates the stable key used to correlate an Infrastructure resource with its Kueue data. */
const resourceKey = (resource: SupportedResource): string =>
  `${resource.kind}/${resource.metadata.namespace}/${resource.metadata.name}`;

/** Finds the Kueue Workload associated with a TrainJob or RayJob by UID, then by name. */
const findTrainingWorkload = (
  resource: TrainJobKind | RayJobKind,
  workloads: WorkloadKind[],
): WorkloadKind | undefined => {
  const byUid = workloads.find(
    (workload) =>
      Boolean(resource.metadata.uid) &&
      workload.metadata?.labels?.['kueue.x-k8s.io/job-uid'] === resource.metadata.uid,
  );
  if (byUid) {
    return byUid;
  }
  return workloads.find(
    (workload) => workload.metadata?.labels?.['kueue.x-k8s.io/job-name'] === resource.metadata.name,
  );
};

/** Builds resource-to-Kueue Workload matches for notebooks, model services, and training jobs. */
const buildKueueWorkloadMatches = (
  workloads: WorkloadKind[],
  pods: PodKind[],
  notebooks: NotebookKind[],
  trainJobs: TrainJobKind[],
  rayJobs: RayJobKind[],
  inferenceServices: InferenceServiceKind[],
  llmInferenceServices: LLMInferenceServiceKind[],
): KueueWorkloadByResourceKey => {
  const matchedWorkloadsByResourceKey: KueueWorkloadByResourceKey = new Map();
  const notebookMatches = buildWorkloadMapForNotebooks(workloads, notebooks);
  for (const notebook of notebooks) {
    const workload = notebookMatches[notebook.metadata.name];
    if (workload) {
      matchedWorkloadsByResourceKey.set(
        resourceKey({ ...notebook, kind: InfrastructureWorkloadKind.Notebook }),
        [workload],
      );
    }
  }

  const deploymentMatches = buildWorkloadMapForDeployments(
    workloads,
    pods,
    inferenceServices,
    llmInferenceServices,
  );
  for (const inferenceService of inferenceServices) {
    const workloadsForInferenceService =
      deploymentMatches[`InferenceService/${inferenceService.metadata.name}`];
    if (workloadsForInferenceService.length > 0) {
      matchedWorkloadsByResourceKey.set(
        resourceKey(inferenceService),
        workloadsForInferenceService,
      );
    }
  }
  for (const llmInferenceService of llmInferenceServices) {
    const workloadsForLLMInferenceService =
      deploymentMatches[`LLMInferenceService/${llmInferenceService.metadata.name}`];
    if (workloadsForLLMInferenceService.length > 0) {
      matchedWorkloadsByResourceKey.set(
        resourceKey(llmInferenceService),
        workloadsForLLMInferenceService,
      );
    }
  }

  for (const resource of [...trainJobs, ...rayJobs]) {
    const workload = findTrainingWorkload(resource, workloads);
    if (workload) {
      matchedWorkloadsByResourceKey.set(resourceKey(resource), [workload]);
    }
  }

  return matchedWorkloadsByResourceKey;
};

/**
 * Finds the Kueue row linked to a resource in the Infrastructure Workloads tab.
 * Hardware Profile resolution does not use this function and remains independent of Kueue.
 */
export const findKueueRowForResource = (
  resource: SupportedResource,
  kueueRows: ClusterQueueWorkloadRow[],
  matchedWorkloads: KueueWorkloadByResourceKey = new Map(),
): ClusterQueueWorkloadRow | undefined => {
  const matchedWorkloadsForResource = matchedWorkloads.get(resourceKey(resource));
  if (matchedWorkloadsForResource) {
    const workloadName = aggregateKueueStatusForModel(matchedWorkloadsForResource)?.workloadName;
    if (workloadName) {
      return kueueRows.find((row) => row.name === workloadName);
    }
  }
  return kueueRows.find((row) => row.name === resource.metadata.name);
};

/** Combines resource status, Hardware Profile data, and optional Kueue data into a table row. */
const toTopLevelRow = (
  resource: SupportedResource,
  type: InfrastructureWorkloadType,
  kueueEnabled: boolean,
  kueueRows: ClusterQueueWorkloadRow[],
  matchedWorkloads: KueueWorkloadByResourceKey,
  kueueAvailabilityState: InfrastructureKueueState,
  hardwareProfileByKey: HardwareProfileByKey,
): InfrastructureWorkloadRow => {
  const { name } = resource.metadata;
  const kueueRow = findKueueRowForResource(resource, kueueRows, matchedWorkloads);
  const hardwareProfileInfo = resolveWorkloadHardwareProfileFromAnnotation(
    [resource.metadata.annotations],
    hardwareProfileByKey,
  );
  const matchedWorkloadsForResource = matchedWorkloads.get(resourceKey(resource)) ?? [];
  const aggregatedKueueStatus = aggregateKueueStatusForModel(matchedWorkloadsForResource);
  const kueueStatus = aggregatedKueueStatus ?? getKueueStatusFromRow(kueueRow);
  const resolvedKueueState = getInfrastructureKueueState(kueueAvailabilityState, kueueRow);
  const deploymentStatus = getInfrastructureModelDeploymentStatus(resource, kueueStatus);
  const jobStatus = getInfrastructureJobStatus(resource, kueueStatus);
  return {
    name,
    namespace: resource.metadata.namespace,
    resource,
    type,
    status: getInfrastructureWorkloadFilterStatus(resource, deploymentStatus),
    jobStatus,
    kueueStatus: kueueStatus?.status,
    deploymentStatus,
    queuePosition: kueueRow?.queuePosition == null ? undefined : `${kueueRow.queuePosition}`,
    priority: kueueRow?.priority,
    hardwareProfile: hardwareProfileInfo?.displayName,
    hardwareProfileResourceType: hardwareProfileInfo?.acceleratorIdentifier,
    isKueueEnabled: kueueEnabled,
    isKueueManaged: !!kueueRow,
    kueueState: resolvedKueueState,
  };
};

/** Lists namespaced Kubernetes resources using the supplied dynamic-plugin model. */
const listResources = async <T extends K8sResourceCommon>(
  model: Parameters<typeof k8sListResource<T>>[0]['model'],
  namespace: string,
) =>
  k8sListResource<T>({ model, queryOptions: { ns: namespace } }).then((response) => response.items);

/**
 * Loads and maps all resources shown in the Infrastructure Workloads tab.
 * Hardware Profiles are resolved independently; Kueue is used only for scheduling metadata.
 */
export const listInfrastructureWorkloads = async (
  namespace: string,
  projectName: string | undefined,
  kueueEnabled: boolean,
  dashboardNamespace = '',
): Promise<InfrastructureWorkloadsResult> => {
  const failedSources: string[] = [];
  const [notebooksResult, trainJobsResult, rayJobsResult, inferenceServicesResult, llmResult] =
    await Promise.all([
      allSettledPromises<NotebookKind[]>([listResources<NotebookKind>(NotebookModel, namespace)]),
      allSettledPromises<TrainJobKind[]>([listResources<TrainJobKind>(TrainJobModel, namespace)]),
      allSettledPromises<RayJobKind[]>([listResources<RayJobKind>(RayJobModel, namespace)]),
      allSettledPromises<InferenceServiceKind[]>([listInferenceService(namespace)]),
      allSettledPromises<LLMInferenceServiceKind[]>([
        listResources<LLMInferenceServiceKind>(LLMInferenceServiceModel, namespace),
      ]),
    ]);

  /** Extracts fulfilled API items and records a source when its request failed. */
  const getItems = <T>(
    result: [PromiseFulfilledResult<T[]>[], unknown[], PromiseSettledResult<T[]>[]],
    source: string,
  ): T[] => {
    if (result[1].length > 0) {
      failedSources.push(source);
      return [];
    }
    return result[0][0]?.value ?? [];
  };

  const notebooks = getItems(notebooksResult, 'Workbenches');
  const trainJobs = getItems(trainJobsResult, 'Training jobs');
  const rayJobs = getItems(rayJobsResult, 'Ray jobs');
  const inferenceServices = getItems(inferenceServicesResult, 'Inference services');
  const llmInferenceServices = getItems(llmResult, 'LLM inference services');

  const resources = [
    ...notebooks.map((resource) => ({ ...resource, kind: InfrastructureWorkloadKind.Notebook })),
    ...trainJobs,
    ...rayJobs,
    ...inferenceServices,
    ...llmInferenceServices,
  ];
  const hardwareProfileByKey = await fetchInfrastructureHardwareProfiles(resources);

  let kueueRows: ClusterQueueWorkloadRow[] = [];
  let matchedWorkloads: KueueWorkloadByResourceKey = new Map();
  let kueueAvailabilityState: InfrastructureKueueState = kueueEnabled ? 'unavailable' : 'non-kueue';
  if (kueueEnabled) {
    try {
      kueueRows = await fetchNamespaceWorkloads(namespace, projectName ?? '', dashboardNamespace);
      const [workloads, pods] = await Promise.all([
        listWorkloads(namespace),
        k8sListResource<PodKind>({ model: PodModel, queryOptions: { ns: namespace } }).then(
          (response) => response.items,
        ),
      ]);
      matchedWorkloads = buildKueueWorkloadMatches(
        workloads,
        pods,
        notebooks,
        trainJobs,
        rayJobs,
        inferenceServices,
        llmInferenceServices,
      );
      kueueAvailabilityState = 'non-kueue';
    } catch {
      failedSources.push('Kueue workloads');
    }
  }
  return {
    kueueEnabled,
    failedSources,
    workloads: [
      ...notebooks.map((resource) =>
        toTopLevelRow(
          { ...resource, kind: InfrastructureWorkloadKind.Notebook },
          getInfrastructureWorkloadType(InfrastructureWorkloadKind.Notebook),
          kueueEnabled,
          kueueRows,
          matchedWorkloads,
          kueueAvailabilityState,
          hardwareProfileByKey,
        ),
      ),
      ...trainJobs.map((resource) =>
        toTopLevelRow(
          resource,
          getInfrastructureWorkloadType(InfrastructureWorkloadKind.TrainJob),
          kueueEnabled,
          kueueRows,
          matchedWorkloads,
          kueueAvailabilityState,
          hardwareProfileByKey,
        ),
      ),
      ...rayJobs.map((resource) =>
        toTopLevelRow(
          resource,
          getInfrastructureWorkloadType(InfrastructureWorkloadKind.RayJob),
          kueueEnabled,
          kueueRows,
          matchedWorkloads,
          kueueAvailabilityState,
          hardwareProfileByKey,
        ),
      ),
      ...inferenceServices.map((resource) =>
        toTopLevelRow(
          resource,
          getInfrastructureWorkloadType(InfrastructureWorkloadKind.InferenceService),
          kueueEnabled,
          kueueRows,
          matchedWorkloads,
          kueueAvailabilityState,
          hardwareProfileByKey,
        ),
      ),
      ...llmInferenceServices.map((resource) =>
        toTopLevelRow(
          resource,
          getInfrastructureWorkloadType(InfrastructureWorkloadKind.LLMInferenceService),
          kueueEnabled,
          kueueRows,
          matchedWorkloads,
          kueueAvailabilityState,
          hardwareProfileByKey,
        ),
      ),
    ],
  };
};
