import { ComponentType } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
  OutlinedClockIcon,
  PauseCircleIcon,
} from '@patternfly/react-icons';
import { AlertVariant, LabelProps } from '@patternfly/react-core';
import { WorkloadCondition } from '@odh-dashboard/internal/k8sTypes';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import type { JobsFilterDataType } from './const';
import { TrainJobKind, RayJobKind, RayClusterKind, RayClusterSpec } from '../../k8sTypes';
import {
  TrainingJobState,
  RayJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
  JobDisplayState,
  UnifiedJobKind,
  isRayJob,
  isTrainJob,
} from '../../types';
import { getWorkloadForJob, setTrainJobPauseState } from '../../api';
import { KUEUE_QUEUE_LABEL } from '../../const';

export enum TrainJobConditionType {
  Succeeded = 'Succeeded',
  Complete = 'Complete',
  Failed = 'Failed',
  Running = 'Running',
  Created = 'Created',
  Restarting = 'Restarting',
}

export enum WorkloadConditionType {
  Finished = 'Finished',
  Evicted = 'Evicted',
  Preempted = 'Preempted',
  QuotaReserved = 'QuotaReserved',
  PodsReady = 'PodsReady',
  Admitted = 'Admitted',
}

export enum ConditionStatus {
  True = 'True',
  False = 'False',
}

export enum JobSectionName {
  Node = 'node',
  DatasetInitializer = 'dataset-initializer',
  DataInitializer = 'data-initializer',
  ModelInitializer = 'model-initializer',
}

export const getStatusInfo = (
  status: JobDisplayState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: ComponentType;
  alertTitle?: string;
  alertVariant?: AlertVariant;
} => {
  switch (status) {
    case TrainingJobState.SUCCEEDED:
      return {
        status: 'success',
        label: 'Complete',
        color: 'green',
        IconComponent: CheckCircleIcon,
        alertTitle: 'Job Complete',
        alertVariant: AlertVariant.success,
      };
    case TrainingJobState.FAILED:
      return {
        status: 'danger',
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
        alertTitle: 'Job Failed',
        alertVariant: AlertVariant.danger,
      };
    case TrainingJobState.RUNNING:
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case TrainingJobState.RESTARTING:
      return {
        label: 'Restarting',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case TrainingJobState.PENDING:
      return {
        label: 'Pending',
        color: 'purple',
        IconComponent: PendingIcon,
      };
    case TrainingJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'grey',
        IconComponent: OutlinedClockIcon,
      };
    case TrainingJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case TrainingJobState.PAUSED:
      return {
        label: 'Paused',
        color: 'grey',
        IconComponent: PauseCircleIcon,
      };
    case TrainingJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case TrainingJobState.PREEMPTED:
      return {
        label: 'Preempted',
        color: 'orange',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
        alertTitle: 'Job Preempted',
        alertVariant: AlertVariant.warning,
      };
    case TrainingJobState.INADMISSIBLE:
      return {
        label: 'Inadmissible',
        color: 'orange',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
        alertTitle: 'Job Inadmissible',
        alertVariant: AlertVariant.warning,
      };
    case TrainingJobState.DELETING:
      return {
        label: 'Deleting',
        color: 'grey',
        IconComponent: InProgressIcon,
      };
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

/**
 * Extract and categorize workload conditions by status type
 * Returns a map of condition types (Failed, Succeeded, etc.) to their matching conditions
 * Similar to the pattern used in distributedWorkloads/utils.tsx
 */
const extractWorkloadConditions = (
  conditions: WorkloadCondition[],
): Record<string, WorkloadCondition | undefined> => {
  return {
    Failed: conditions.find(
      ({ type, status, message, reason }) =>
        status === ConditionStatus.True &&
        type === WorkloadConditionType.Finished &&
        /error|failed|rejected/.test(`${message || ''} ${reason || ''}`.toLowerCase()),
    ),
    Succeeded: conditions.find(
      ({ type, status, message, reason }) =>
        status === ConditionStatus.True &&
        type === WorkloadConditionType.Finished &&
        /success|succeeded/.test(`${message || ''} ${reason || ''}`.toLowerCase()),
    ),
    Evicted: conditions.find(
      ({ type, status }) =>
        type === WorkloadConditionType.Evicted && status === ConditionStatus.True,
    ),
    Preempted: conditions.find(
      ({ type, status }) =>
        type === WorkloadConditionType.Preempted && status === ConditionStatus.True,
    ),
    Inadmissible: conditions.find(
      ({ type, status, reason }) =>
        type === WorkloadConditionType.QuotaReserved &&
        status === ConditionStatus.False &&
        reason === 'Inadmissible',
    ),
    Pending: conditions.find(
      ({ type, status }) =>
        type === WorkloadConditionType.QuotaReserved && status === ConditionStatus.False,
    ),
    Running: conditions.find(
      ({ type, status }) =>
        type === WorkloadConditionType.PodsReady && status === ConditionStatus.True,
    ),
    Admitted: conditions.find(
      ({ type, status }) =>
        type === WorkloadConditionType.Admitted && status === ConditionStatus.True,
    ),
  };
};

/**
 * Get basic TrainJob status from conditions (synchronous)
 * This is the core status extraction function used internally
 */
const getBasicJobStatus = (job: TrainJobKind): TrainingJobState => {
  if (!job.status?.conditions) {
    return TrainingJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find(
    (condition) => condition.status === ConditionStatus.True,
  );

  if (!currentCondition) {
    return TrainingJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case TrainJobConditionType.Succeeded:
    case TrainJobConditionType.Complete:
      return TrainingJobState.SUCCEEDED;
    case TrainJobConditionType.Failed:
      return TrainingJobState.FAILED;
    case TrainJobConditionType.Running:
      return TrainingJobState.RUNNING;
    case TrainJobConditionType.Created:
      return TrainingJobState.CREATED;
    case TrainJobConditionType.Restarting:
      return TrainingJobState.RESTARTING;
    default:
      return TrainingJobState.UNKNOWN;
  }
};

/**
 * Get training job status with pause/resume support (async)
 *
 * Status determination follows this priority order (higher priority checked first):
 *
 * 1. Terminal states:
 *    - Deleting: TrainJob has deletionTimestamp set
 *    - Complete: TrainJob Succeeded condition
 *    - Failed: TrainJob Failed condition
 *
 * 2. System states:
 *    - Inadmissible: Workload QuotaReserved=False with reason=Inadmissible
 *
 * 3. User actions (checked before preempted/running):
 *    - Paused: workload.spec.active=false or spec.suspend=true
 *
 * 4. System states:
 *    - Preempted: Workload Evicted or Preempted condition
 *
 * 5. Active states:
 *    - Running: Workload PodsReady=True OR jobsStatus[*].active > 0
 *
 * 6. Pending:
 *    - Pending: Workload QuotaReserved=True (resources allocated, waiting for pods)
 *
 * 7. Fallback:
 *    - Queued: Simple fallback for everything else
 *
 * @param job - TrainJob to check status for
 * @param options - Configuration options
 * @returns Promise resolving to the job's current status
 */
export const getTrainingJobStatus = async (
  job: TrainJobKind,
  options: {
    skipPauseCheck?: boolean;
  } = {},
): Promise<{ status: TrainingJobState; isLoading: boolean; error?: string }> => {
  const { skipPauseCheck = false } = options;

  try {
    // Terminal states (checked first)
    if (job.metadata.deletionTimestamp) {
      return { status: TrainingJobState.DELETING, isLoading: false };
    }

    const basicStatus = getBasicJobStatus(job);

    if (skipPauseCheck) {
      if (basicStatus === TrainingJobState.SUCCEEDED) {
        return { status: TrainingJobState.SUCCEEDED, isLoading: false };
      }
      return { status: basicStatus, isLoading: false };
    }

    if (basicStatus === TrainingJobState.SUCCEEDED) {
      return { status: TrainingJobState.SUCCEEDED, isLoading: false };
    }

    // Check if job has Kueue queue label
    const hasQueueLabel =
      job.metadata.labels?.[KUEUE_QUEUE_LABEL] || job.spec.labels?.[KUEUE_QUEUE_LABEL];

    // ==============
    // NON-KUEUE JOBS
    // ==============
    if (!hasQueueLabel) {
      // Failed takes priority (terminal state - cannot be resumed)
      if (basicStatus === TrainingJobState.FAILED) {
        return { status: TrainingJobState.FAILED, isLoading: false };
      }

      // Paused (user action - can be resumed, but checked before RUNNING)
      if (job.spec.suspend === true) {
        return { status: TrainingJobState.PAUSED, isLoading: false };
      }

      // Running (has active jobs)
      const hasActiveJobs = job.status?.jobsStatus?.some((js) => (js.active ?? 0) > 0);
      if (hasActiveJobs) {
        return { status: TrainingJobState.RUNNING, isLoading: false };
      }

      if (basicStatus === TrainingJobState.CREATED) {
        return { status: TrainingJobState.CREATED, isLoading: false };
      }

      return { status: basicStatus, isLoading: false };
    }

    // ==================
    // KUEUE-ENABLED JOBS
    // ==================
    const workload = await getWorkloadForJob(job);

    if (workload) {
      const conditions = workload.status?.conditions || [];
      const workloadConditionsMap = extractWorkloadConditions(conditions);

      // System rejection (takes priority over failure states)
      if (workloadConditionsMap.Inadmissible) {
        return { status: TrainingJobState.INADMISSIBLE, isLoading: false };
      }

      // TrainJob failure (takes priority over Workload queued state)
      if (basicStatus === TrainingJobState.FAILED) {
        return { status: TrainingJobState.FAILED, isLoading: false };
      }

      // Terminal and active states (checked in priority order)
      if (workloadConditionsMap.Failed) {
        return { status: TrainingJobState.FAILED, isLoading: false };
      }
      if (workloadConditionsMap.Succeeded) {
        return { status: TrainingJobState.SUCCEEDED, isLoading: false };
      }

      // Paused (user action - checked before PREEMPTED)
      if (workload.spec.active === false || job.spec.suspend === true) {
        return { status: TrainingJobState.PAUSED, isLoading: false };
      }

      if (workloadConditionsMap.Evicted || workloadConditionsMap.Preempted) {
        return { status: TrainingJobState.PREEMPTED, isLoading: false };
      }

      // Running: PodsReady=True OR any jobsStatus has active > 0
      const hasActiveJobs = job.status?.jobsStatus?.some((js) => (js.active ?? 0) > 0);
      if (workloadConditionsMap.Running || hasActiveJobs) {
        return { status: TrainingJobState.RUNNING, isLoading: false };
      }

      // Pending: QuotaReserved=True means resources allocated, waiting for pods
      const quotaReservedCondition = conditions.find(
        (c) => c.type === WorkloadConditionType.QuotaReserved && c.status === ConditionStatus.True,
      );
      if (quotaReservedCondition) {
        return { status: TrainingJobState.PENDING, isLoading: false };
      }

      // Queued: Simple fallback for everything else
      return { status: TrainingJobState.QUEUED, isLoading: false };
    }

    // Kueue-enabled but workload not created yet
    // Failed takes priority (terminal state - cannot be resumed)
    if (basicStatus === TrainingJobState.FAILED) {
      return { status: TrainingJobState.FAILED, isLoading: false };
    }

    // Paused (user action - can be resumed, but checked before RUNNING)
    if (job.spec.suspend === true) {
      return { status: TrainingJobState.PAUSED, isLoading: false };
    }

    // Running (has active jobs)
    const hasActiveJobs = job.status?.jobsStatus?.some((js) => (js.active ?? 0) > 0);
    if (hasActiveJobs) {
      return { status: TrainingJobState.RUNNING, isLoading: false };
    }

    // Default: Queued (waiting for workload to be created)
    return { status: TrainingJobState.QUEUED, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for TrainJob ${job.metadata.name}:`, errorMessage);

    return {
      status: getBasicJobStatus(job),
      isLoading: false,
      error: errorMessage,
    };
  }
};

/**
 * Get training job status (synchronous version for sorting/filtering)
 * This version checks basic TrainJob status, deletionTimestamp, and spec.suspend
 * Note: This does NOT check Workload status (async operation). Use getTrainingJobStatus for full status.
 * @param job - TrainJob to check status for
 * @returns Job status including basic checks (deleting, paused, terminal states)
 */
export const getTrainingJobStatusSync = (job: TrainJobKind): TrainingJobState => {
  // Priority 1: Check if job is being deleted
  if (job.metadata.deletionTimestamp) {
    return TrainingJobState.DELETING;
  }

  const basicStatus = getBasicJobStatus(job);

  // Skip pause check for terminal states
  if (basicStatus === TrainingJobState.SUCCEEDED || basicStatus === TrainingJobState.FAILED) {
    return basicStatus;
  }

  // Check for non-Kueue job suspension via spec.suspend
  const isSuspended = job.spec.suspend === true;
  if (isSuspended) {
    return TrainingJobState.PAUSED;
  }

  return basicStatus;
};

export const getStatusFlags = (
  status: JobDisplayState,
): {
  isRunning: boolean;
  isFailed: boolean;
  isComplete: boolean;
  isQueued: boolean;
  isPending: boolean;
  isInadmissible: boolean;
  isPreempted: boolean;
  isPaused: boolean;
  isSuspended: boolean;
  isDeleting: boolean;
  isCreated: boolean;
  isRestarting: boolean;
  isUnknown: boolean;
  inProgress: boolean;
  canPauseResume: boolean;
} => {
  const flags = {
    isRunning: status === TrainingJobState.RUNNING,
    isFailed: status === TrainingJobState.FAILED,
    isComplete: status === TrainingJobState.SUCCEEDED,
    isQueued: status === TrainingJobState.QUEUED,
    isPending: status === TrainingJobState.PENDING,
    isInadmissible: status === TrainingJobState.INADMISSIBLE,
    isPreempted: status === TrainingJobState.PREEMPTED,
    isPaused: status === TrainingJobState.PAUSED,
    isSuspended: status === TrainingJobState.SUSPENDED,
    isDeleting: status === TrainingJobState.DELETING,
    isCreated: status === TrainingJobState.CREATED,
    isRestarting: status === TrainingJobState.RESTARTING,
    isUnknown: status === TrainingJobState.UNKNOWN,
  };

  const inProgress =
    flags.isRunning ||
    flags.isPending ||
    flags.isQueued ||
    flags.isInadmissible ||
    flags.isPreempted;

  return {
    ...flags,
    inProgress,
    canPauseResume:
      ((inProgress && !flags.isInadmissible) || flags.isPaused) &&
      !flags.isComplete &&
      !flags.isFailed &&
      !flags.isDeleting &&
      !flags.isUnknown,
  };
};

/**
 * Extract title and description from a condition/event
 * Uses reason as title (short, title-like) and message as description
 */
const extractTitleAndDescription = (
  condition: { reason?: string; message?: string },
  fallbackTitle: string,
): { title: string; description?: string } => {
  const title = condition.reason || fallbackTitle;
  const description = condition.message || condition.reason;
  return { title, description };
};

/**
 * Update title and description from extracted data if not already set
 */
const updateTitleAndDescription = (
  extracted: { title: string; description?: string },
  currentTitle: string,
  currentDescription: string | undefined,
  fallbackTitle: string,
): { title: string; description?: string } => {
  return {
    title: currentTitle === fallbackTitle ? extracted.title : currentTitle,
    description: currentDescription || extracted.description,
  };
};

/**
 * Get status alert with title and description from backend sources
 *
 * Priority order for fetching alert data:
 * 1. TrainJob conditions (most direct)
 * 2. Workload conditions (uses extractWorkloadConditions for consistency)
 * 3. Events (fallback, only for failed jobs)
 *
 * Falls back to hardcoded title from getStatusInfo if no backend data found.
 */
export const getStatusAlert = (
  status: JobDisplayState,
  workloadConditions?: WorkloadCondition[],
  trainJobConditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
  }>,
  events?: Array<{
    message?: string;
    reason?: string;
    type?: string;
  }>,
): {
  title: string;
  description?: string;
  variant: AlertVariant;
} | null => {
  const statusInfo = getStatusInfo(status);
  if (!statusInfo.alertTitle || !statusInfo.alertVariant) {
    return null;
  }

  let title = statusInfo.alertTitle;
  let description: string | undefined;

  // Priority 1: TrainJob conditions
  if (trainJobConditions && trainJobConditions.length > 0) {
    if (status === TrainingJobState.FAILED) {
      const failedCondition = trainJobConditions.find(
        (c) => c.type === TrainJobConditionType.Failed && c.status === ConditionStatus.True,
      );
      if (failedCondition) {
        const extracted = extractTitleAndDescription(failedCondition, statusInfo.alertTitle);
        title = extracted.title;
        description = extracted.description;
      }
    } else if (status === TrainingJobState.SUCCEEDED) {
      const succeededCondition = trainJobConditions.find(
        (c) =>
          (c.type === TrainJobConditionType.Succeeded ||
            c.type === TrainJobConditionType.Complete) &&
          c.status === ConditionStatus.True,
      );
      if (succeededCondition) {
        const extracted = extractTitleAndDescription(succeededCondition, statusInfo.alertTitle);
        title = extracted.title;
        description = extracted.description;
      }
    }
  }

  // Priority 2: Workload conditions (reuse extractWorkloadConditions for consistency)
  if ((!description || title === statusInfo.alertTitle) && workloadConditions) {
    const workloadConditionsMap = extractWorkloadConditions(workloadConditions);
    let condition: WorkloadCondition | undefined;

    if (status === TrainingJobState.FAILED) {
      condition = workloadConditionsMap.Failed;
    } else if (status === TrainingJobState.SUCCEEDED) {
      condition = workloadConditionsMap.Succeeded;
    } else if (status === TrainingJobState.INADMISSIBLE) {
      condition = workloadConditionsMap.Inadmissible;
    } else if (status === TrainingJobState.PREEMPTED) {
      condition = workloadConditionsMap.Evicted || workloadConditionsMap.Preempted;
    }

    if (condition) {
      const extracted = extractTitleAndDescription(condition, statusInfo.alertTitle);
      const updated = updateTitleAndDescription(
        extracted,
        title,
        description,
        statusInfo.alertTitle,
      );
      title = updated.title;
      description = updated.description;
    }
  }

  // Priority 3: Events (fallback, only for failed jobs)
  if (
    (!description || title === statusInfo.alertTitle) &&
    events &&
    status === TrainingJobState.FAILED
  ) {
    const warningEvent = events.find((e) => e.type === 'Warning');
    if (warningEvent) {
      const extracted = extractTitleAndDescription(warningEvent, statusInfo.alertTitle);
      const updated = updateTitleAndDescription(
        extracted,
        title,
        description,
        statusInfo.alertTitle,
      );
      title = updated.title;
      description = updated.description;
    }
  }

  return {
    title,
    description,
    variant: statusInfo.alertVariant,
  };
};

/**
 * Get section status from jobsStatus entry
 * Determines status based on job counts: failed > succeeded > active/ready > suspended (paused) > unknown
 */
const getStatusFromJobStatus = (jobStatus: {
  failed?: number;
  succeeded?: number;
  active?: number;
  ready?: number;
  suspended?: number;
}): TrainingJobState => {
  if (jobStatus.failed && jobStatus.failed > 0) {
    return TrainingJobState.FAILED;
  }
  if (jobStatus.succeeded && jobStatus.succeeded > 0) {
    return TrainingJobState.SUCCEEDED;
  }
  if ((jobStatus.active && jobStatus.active > 0) || (jobStatus.ready && jobStatus.ready > 0)) {
    return TrainingJobState.RUNNING;
  }
  if (jobStatus.suspended && jobStatus.suspended > 0) {
    return TrainingJobState.PAUSED;
  }
  return TrainingJobState.UNKNOWN;
};

/**
 * Check if sections exist in jobsStatus (not inferred)
 * Returns which sections are actually configured
 */
export const getSectionExistence = (
  jobsStatus?: Array<{
    name: string;
    failed?: number;
    succeeded?: number;
    active?: number;
    ready?: number;
    suspended?: number;
  }>,
): {
  hasDataInitializer: boolean;
  hasModelInitializer: boolean;
  hasTraining: boolean;
} => {
  if (!jobsStatus) {
    return {
      hasDataInitializer: false,
      hasModelInitializer: false,
      hasTraining: false,
    };
  }

  const hasDataInitializer = jobsStatus.some(
    (js) =>
      js.name === JobSectionName.DatasetInitializer || js.name === JobSectionName.DataInitializer,
  );
  const hasModelInitializer = jobsStatus.some((js) => js.name === JobSectionName.ModelInitializer);
  const hasTraining = jobsStatus.some((js) => js.name === JobSectionName.Node);

  return {
    hasDataInitializer,
    hasModelInitializer,
    hasTraining,
  };
};

/**
 * Get section statuses directly from jobsStatus (without needing pods)
 * This is the preferred method as it doesn't require fetching pods
 */
export const getSectionStatusesFromJobsStatus = (
  jobsStatus?: Array<{
    name: string;
    failed?: number;
    succeeded?: number;
    active?: number;
    ready?: number;
    suspended?: number;
  }>,
  overallJobStatus?: JobDisplayState,
): {
  initialization: TrainingJobState;
  dataInitializer: TrainingJobState;
  modelInitializer: TrainingJobState;
  training: TrainingJobState;
} => {
  let dataInitializerStatus: TrainingJobState = TrainingJobState.UNKNOWN;
  let modelInitializerStatus: TrainingJobState = TrainingJobState.UNKNOWN;
  let trainingStatus: TrainingJobState = TrainingJobState.UNKNOWN;

  if (jobsStatus) {
    // Find data initializer job
    const dataInitJob = jobsStatus.find(
      (js) =>
        js.name === JobSectionName.DatasetInitializer || js.name === JobSectionName.DataInitializer,
    );
    if (dataInitJob) {
      dataInitializerStatus = getStatusFromJobStatus(dataInitJob);
    }

    // Find model initializer job
    const modelInitJob = jobsStatus.find((js) => js.name === JobSectionName.ModelInitializer);
    if (modelInitJob) {
      modelInitializerStatus = getStatusFromJobStatus(modelInitJob);
    }

    // Find training job (node)
    const trainingJob = jobsStatus.find((js) => js.name === JobSectionName.Node);
    if (trainingJob) {
      trainingStatus = getStatusFromJobStatus(trainingJob);
    }
  }

  // If overall job succeeded and a section is unknown, infer it succeeded
  if (overallJobStatus === TrainingJobState.SUCCEEDED) {
    if (dataInitializerStatus === TrainingJobState.UNKNOWN) {
      dataInitializerStatus = TrainingJobState.SUCCEEDED;
    }
    if (modelInitializerStatus === TrainingJobState.UNKNOWN) {
      modelInitializerStatus = TrainingJobState.SUCCEEDED;
    }
    if (trainingStatus === TrainingJobState.UNKNOWN) {
      trainingStatus = TrainingJobState.SUCCEEDED;
    }
  }

  // If overall job failed and training is unknown, infer it failed
  if (overallJobStatus === TrainingJobState.FAILED && trainingStatus === TrainingJobState.UNKNOWN) {
    trainingStatus = TrainingJobState.FAILED;
  }

  const getInitializationStatus = (
    dataStatus: TrainingJobState,
    modelStatus: TrainingJobState,
  ): TrainingJobState => {
    if (dataStatus === TrainingJobState.SUCCEEDED && modelStatus === TrainingJobState.SUCCEEDED) {
      return TrainingJobState.SUCCEEDED;
    }
    if (dataStatus === TrainingJobState.FAILED || modelStatus === TrainingJobState.FAILED) {
      return TrainingJobState.FAILED;
    }
    if (dataStatus === TrainingJobState.RUNNING || modelStatus === TrainingJobState.RUNNING) {
      return TrainingJobState.RUNNING;
    }
    if (dataStatus === TrainingJobState.PAUSED || modelStatus === TrainingJobState.PAUSED) {
      return TrainingJobState.PAUSED;
    }
    if (dataStatus === TrainingJobState.UNKNOWN && modelStatus === TrainingJobState.UNKNOWN) {
      return TrainingJobState.UNKNOWN;
    }
    return TrainingJobState.RUNNING;
  };

  return {
    initialization: getInitializationStatus(dataInitializerStatus, modelInitializerStatus),
    dataInitializer: dataInitializerStatus,
    modelInitializer: modelInitializerStatus,
    training: trainingStatus,
  };
};

/**
 * Get status alert config for the RayJob status modal.
 * Sources (checked in priority order):
 *   1. RayJob CR  — job.status.reason / job.status.message (KubeRay controller output)
 *   2. Workload conditions — workloadConditions from the Kueue Workload
 */
export const getRayJobStatusAlert = (
  status: JobDisplayState,
  job: RayJobKind,
  workloadConditions?: WorkloadCondition[],
): {
  title: string;
  description?: string;
  variant: AlertVariant;
} | null => {
  const statusInfo = getStatusInfo(status);

  const crMessage = job.status?.message;
  const crReason = job.status?.reason;

  const workloadConditionsMap = workloadConditions
    ? extractWorkloadConditions(workloadConditions)
    : undefined;

  const mergeWithWorkload = (
    wlCondition: WorkloadCondition | undefined,
    fallbackTitle: string,
  ): { title: string; description?: string } => {
    const wl = wlCondition ? extractTitleAndDescription(wlCondition, fallbackTitle) : undefined;
    return {
      title: crReason || wl?.title || fallbackTitle,
      description: crMessage || wl?.description,
    };
  };

  if (status === RayJobState.FAILED || status === TrainingJobState.FAILED) {
    const { title, description } = mergeWithWorkload(
      workloadConditionsMap?.Failed,
      statusInfo.alertTitle || 'Job Failed',
    );
    return { title, description, variant: AlertVariant.danger };
  }

  if (status === RayJobState.INADMISSIBLE || status === TrainingJobState.INADMISSIBLE) {
    const { title, description } = mergeWithWorkload(
      workloadConditionsMap?.Inadmissible,
      statusInfo.alertTitle || statusInfo.label,
    );
    return { title, description, variant: AlertVariant.warning };
  }

  if (status === RayJobState.PREEMPTED || status === TrainingJobState.PREEMPTED) {
    const { title, description } = mergeWithWorkload(
      workloadConditionsMap?.Evicted || workloadConditionsMap?.Preempted,
      statusInfo.alertTitle || statusInfo.label,
    );
    return { title, description, variant: AlertVariant.warning };
  }

  if (
    (status === RayJobState.QUEUED ||
      status === TrainingJobState.QUEUED ||
      status === RayJobState.PENDING ||
      status === TrainingJobState.PENDING) &&
    crMessage
  ) {
    return {
      title: crReason || statusInfo.label,
      description: crMessage,
      variant: AlertVariant.info,
    };
  }

  return null;
};

export const handlePauseResume = async (
  job: TrainJobKind,
  isPaused: boolean,
  pauseJob: () => Promise<void>,
  onSuccess?: () => void,
  onError?: (error: Error) => void,
): Promise<void> => {
  try {
    if (isPaused) {
      const result = await setTrainJobPauseState(job, false);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resume job');
      }
    } else {
      await pauseJob();
    }
    onSuccess?.();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
    console.error(`Failed to ${isPaused ? 'resume' : 'pause'} job:`, errorObj);
    onError?.(errorObj);
    throw errorObj;
  }
};

export const handleRetry = async (
  retryJob: () => Promise<void>,
  onSuccess?: () => void,
  onError?: (error: Error) => void,
): Promise<void> => {
  try {
    await retryJob();
    onSuccess?.();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
    console.error('Failed to retry job:', errorObj);
    onError?.(errorObj);
    throw errorObj;
  }
};

const getNodeCountFromClusterSpec = (spec: RayClusterSpec): number => {
  const workerSpecs = spec.workerGroupSpecs ?? [];
  const workerCount = workerSpecs.reduce((sum, group) => sum + (group.replicas ?? 0), 0);
  return workerCount + 1;
};

/**
 * Get node count for a RayJob by aggregating workerGroupSpecs replicas + 1 head node.
 *
 * Lifecycled clusters use the inline `rayClusterSpec`.
 * Workspace clusters resolve via `clusterSelector['ray.io/cluster']` against
 * the provided `rayClustersMap`.
 */
export const getRayJobNodeCount = (
  job: RayJobKind,
  rayClustersMap?: Map<string, RayClusterKind>,
): number => {
  if (job.spec.rayClusterSpec) {
    return getNodeCountFromClusterSpec(job.spec.rayClusterSpec);
  }

  const clusterName = job.spec.clusterSelector?.['ray.io/cluster'];
  if (clusterName && rayClustersMap) {
    const cluster = rayClustersMap.get(clusterName);
    if (cluster) {
      return getNodeCountFromClusterSpec(cluster.spec);
    }
  }

  return 0;
};

/**
 * Get node count for any job type using type guards.
 */
export const getUnifiedJobNodeCount = (
  job: UnifiedJobKind,
  rayClustersMap?: Map<string, RayClusterKind>,
): number => {
  if (isRayJob(job)) {
    return getRayJobNodeCount(job, rayClustersMap);
  }
  if (isTrainJob(job)) {
    return job.spec.trainer?.numNodes ?? 0;
  }
  return 0;
};

/**
 * Basic RayJob status mapping from jobDeploymentStatus to TrainingJobState.
 * This is a simplified synchronous version used for sorting and filtering.
 * For the full composite status (CR + Workload/Kueue), use getRayJobStatus.
 */
export const getRayJobStatusSync = (job: RayJobKind): RayJobState => {
  if (job.metadata.deletionTimestamp) {
    return RayJobState.DELETING;
  }

  const { jobStatus, jobDeploymentStatus } = job.status ?? {};

  if (
    jobDeploymentStatus === RayJobDeploymentStatus.COMPLETE &&
    (jobStatus === RayJobStatusValue.SUCCEEDED || jobStatus === RayJobStatusValue.STOPPED)
  ) {
    return RayJobState.SUCCEEDED;
  }
  if (
    jobDeploymentStatus === RayJobDeploymentStatus.FAILED ||
    jobDeploymentStatus === RayJobDeploymentStatus.VALIDATION_FAILED ||
    jobStatus === RayJobStatusValue.FAILED
  ) {
    return RayJobState.FAILED;
  }
  if (
    jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDED ||
    jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDING ||
    job.spec.suspend === true
  ) {
    return RayJobState.PAUSED;
  }
  if (
    jobStatus === RayJobStatusValue.RUNNING ||
    jobDeploymentStatus === RayJobDeploymentStatus.RUNNING
  ) {
    return RayJobState.RUNNING;
  }
  if (jobStatus === RayJobStatusValue.PENDING) {
    return RayJobState.PENDING;
  }
  if (jobDeploymentStatus === RayJobDeploymentStatus.INITIALIZING) {
    return RayJobState.PENDING;
  }
  if (
    jobDeploymentStatus === RayJobDeploymentStatus.WAITING ||
    jobDeploymentStatus === RayJobDeploymentStatus.RETRYING
  ) {
    return RayJobState.QUEUED;
  }

  return RayJobState.UNKNOWN;
};

/**
 * Get RayJob status with composite CR + Workload/Kueue support (async).
 *
 * Status determination follows this priority order (higher priority checked first):
 *
 * 1. Terminal: deletionTimestamp set → DELETING
 * 2. CR: jobStatus SUCCEEDED && jobDeploymentStatus Complete/STOPPED → SUCCEEDED
 * 3. Kueue (workload present): QuotaReserved=False + Inadmissible → INADMISSIBLE
 * 4. CR: jobStatus Failed || jobDeploymentStatus Failed/ValidationFailed → FAILED (after Inadmissible for Kueue jobs)
 * 5. Kueue (workload present): Workload Finished + error/failed/rejected → FAILED
 * 6. Kueue (workload present): Workload Finished + success/succeeded → SUCCEEDED
 * 7. CR + Kueue: workload.spec.active=false || jobDeploymentStatus Suspended/Suspending || spec.suspend=true → PAUSED
 * 8. Kueue (workload present): Workload Evicted/Preempted → PREEMPTED
 * 9. CR + Kueue: PodsReady=True || jobStatus RUNNING || jobDeploymentStatus Running → RUNNING
 * 10. CR + Kueue: QuotaReserved=True || jobDeploymentStatus Initializing || jobStatus PENDING → PENDING
 * 11. Fallback → QUEUED
 *
 * @param job - RayJob to check status for
 * @returns Promise resolving to the job's current status
 */
export const getRayJobStatus = async (
  job: RayJobKind,
): Promise<{ status: RayJobState; isLoading: boolean; error?: string }> => {
  try {
    // P1: Terminal — being deleted
    if (job.metadata.deletionTimestamp) {
      return { status: RayJobState.DELETING, isLoading: false };
    }

    const { jobStatus, jobDeploymentStatus } = job.status ?? {};

    // P2: CR terminal success (checked before async workload call)
    if (
      (jobStatus === RayJobStatusValue.SUCCEEDED || jobStatus === RayJobStatusValue.STOPPED) &&
      jobDeploymentStatus === RayJobDeploymentStatus.COMPLETE
    ) {
      return { status: RayJobState.SUCCEEDED, isLoading: false };
    }

    // Check if job is Kueue-managed
    const hasQueueLabel = job.metadata.labels?.[KUEUE_QUEUE_LABEL];

    if (!hasQueueLabel) {
      // P4: CR terminal failure (non-Kueue only — for Kueue jobs, checked after Inadmissible)
      if (
        jobStatus === RayJobStatusValue.FAILED ||
        jobDeploymentStatus === RayJobDeploymentStatus.FAILED ||
        jobDeploymentStatus === RayJobDeploymentStatus.VALIDATION_FAILED
      ) {
        return { status: RayJobState.FAILED, isLoading: false };
      }
      // Non-Kueue: fall back to sync logic for remaining states
      return { status: getRayJobStatusSync(job), isLoading: false };
    }

    // ==================
    // KUEUE-ENABLED JOBS
    // ==================
    const workload = await getWorkloadForJob(job);

    if (workload) {
      const conditions = workload.status?.conditions || [];
      const workloadConditionsMap = extractWorkloadConditions(conditions);

      // P3: System rejection
      if (workloadConditionsMap.Inadmissible) {
        return { status: RayJobState.INADMISSIBLE, isLoading: false };
      }

      // P4: CR terminal failure (checked after Inadmissible for Kueue jobs)
      if (
        jobStatus === RayJobStatusValue.FAILED ||
        jobDeploymentStatus === RayJobDeploymentStatus.FAILED ||
        jobDeploymentStatus === RayJobDeploymentStatus.VALIDATION_FAILED
      ) {
        return { status: RayJobState.FAILED, isLoading: false };
      }

      // P5: Workload-reported failure
      if (workloadConditionsMap.Failed) {
        return { status: RayJobState.FAILED, isLoading: false };
      }

      // P6: Workload-reported success
      if (workloadConditionsMap.Succeeded) {
        return { status: RayJobState.SUCCEEDED, isLoading: false };
      }

      // P7: Paused (user action)
      if (
        workload.spec.active === false ||
        jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDED ||
        jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDING ||
        job.spec.suspend === true
      ) {
        return { status: RayJobState.PAUSED, isLoading: false };
      }

      // P8: Preempted
      if (workloadConditionsMap.Evicted || workloadConditionsMap.Preempted) {
        return { status: RayJobState.PREEMPTED, isLoading: false };
      }

      // P9: Running
      if (
        workloadConditionsMap.Running ||
        jobStatus === RayJobStatusValue.RUNNING ||
        jobDeploymentStatus === RayJobDeploymentStatus.RUNNING
      ) {
        return { status: RayJobState.RUNNING, isLoading: false };
      }

      // P10: Pending
      const quotaReservedCondition = conditions.find(
        (c) => c.type === WorkloadConditionType.QuotaReserved && c.status === ConditionStatus.True,
      );
      if (
        quotaReservedCondition ||
        jobDeploymentStatus === RayJobDeploymentStatus.INITIALIZING ||
        jobStatus === RayJobStatusValue.PENDING
      ) {
        return { status: RayJobState.PENDING, isLoading: false };
      }

      // P11: Queued fallback
      return { status: RayJobState.QUEUED, isLoading: false };
    }

    // Kueue-enabled but workload not yet created — use CR fields only
    // P4: CR terminal failure
    if (
      jobStatus === RayJobStatusValue.FAILED ||
      jobDeploymentStatus === RayJobDeploymentStatus.FAILED ||
      jobDeploymentStatus === RayJobDeploymentStatus.VALIDATION_FAILED
    ) {
      return { status: RayJobState.FAILED, isLoading: false };
    }

    // P7: Paused
    if (
      jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDED ||
      jobDeploymentStatus === RayJobDeploymentStatus.SUSPENDING ||
      job.spec.suspend === true
    ) {
      return { status: RayJobState.PAUSED, isLoading: false };
    }

    // P9: Running
    if (
      jobStatus === RayJobStatusValue.RUNNING ||
      jobDeploymentStatus === RayJobDeploymentStatus.RUNNING
    ) {
      return { status: RayJobState.RUNNING, isLoading: false };
    }

    // P10: Pending
    if (
      jobDeploymentStatus === RayJobDeploymentStatus.INITIALIZING ||
      jobStatus === RayJobStatusValue.PENDING
    ) {
      return { status: RayJobState.PENDING, isLoading: false };
    }

    // P11: Queued — waiting for workload to be created
    return { status: RayJobState.QUEUED, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for RayJob ${job.metadata.name}:`, errorMessage);
    return {
      status: getRayJobStatusSync(job),
      isLoading: false,
      error: errorMessage,
    };
  }
};

/**
 * Get status for any job type using type guards (synchronous).
 */
export const getUnifiedJobStatusSync = (job: UnifiedJobKind): JobDisplayState => {
  if (isRayJob(job)) {
    return getRayJobStatusSync(job);
  }
  return getTrainingJobStatusSync(job);
};

export const filterJob = (
  job: UnifiedJobKind,
  filterData: Partial<JobsFilterDataType>,
  jobStatuses: Map<string, JobDisplayState>,
): boolean => {
  const nameFilter = filterData.Name?.toLowerCase();
  const statusFilter = filterData.Status?.toLowerCase();
  const clusterQueueFilter = filterData['Cluster queue']?.toLowerCase();
  const typeFilter = filterData.Type;

  if (nameFilter && !getDisplayNameFromK8sResource(job).toLowerCase().includes(nameFilter)) {
    return false;
  }

  if (statusFilter) {
    const jobId = job.metadata.uid || job.metadata.name;
    const jobStatus = jobStatuses.get(jobId) || getUnifiedJobStatusSync(job);
    if (!getStatusInfo(jobStatus).label.toLowerCase().includes(statusFilter)) {
      return false;
    }
  }

  if (
    clusterQueueFilter &&
    !(job.metadata.labels?.[KUEUE_QUEUE_LABEL] || '').toLowerCase().includes(clusterQueueFilter)
  ) {
    return false;
  }

  if (typeFilter && job.kind !== typeFilter) {
    return false;
  }

  return true;
};
