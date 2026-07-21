import type {
  DeploymentCondition,
  DeploymentStatus,
} from '@odh-dashboard/model-serving/extension-points';
import { toConditionStatus } from '@odh-dashboard/model-serving/extension-points';
import {
  ModelDeploymentState,
  checkModelPodStatus,
  type ModelStatus,
} from '@odh-dashboard/model-serving/shared';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sAPIOptions, PodKind } from '@odh-dashboard/k8s-core';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';
import {
  LLMdDeployment,
  LLMInferenceServiceKind,
  LLMInferenceServiceModel,
  LLMInferenceServiceReadyConditionReason,
} from '../types';

export const useLLMInferenceServicePods = (
  namespace: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<PodKind[]> =>
  useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
      selector: {
        matchLabels: {
          'app.kubernetes.io/component': 'llminferenceservice-workload',
        },
      },
    },
    PodModel,
    opts,
  );

type LLMdConditionSpec = {
  type: string;
  label: string;
  children?: { type: string; label: string }[];
};

const LLMD_CONDITION_SPECS: LLMdConditionSpec[] = [
  { type: 'PresetsCombined', label: 'Presets combined' },
  {
    type: 'WorkloadsReady',
    label: 'Model workload',
    children: [
      { type: 'MainWorkloadReady', label: 'Main workload ready' },
      { type: 'WorkerWorkloadReady', label: 'Worker workload ready' },
      { type: 'PrefillWorkloadReady', label: 'Prefill workload ready' },
      { type: 'PrefillWorkerWorkloadReady', label: 'Prefill worker workload ready' },
      { type: 'ScalingReady', label: 'Scaling ready' },
      { type: 'PrefillScalingReady', label: 'Prefill scaling ready' },
    ],
  },
  {
    type: 'RouterReady',
    label: 'Router / scheduler',
    children: [
      { type: 'GatewaysReady', label: 'Gateway ready' },
      { type: 'HTTPRoutesReady', label: 'HTTP routes ready' },
      { type: 'InferencePoolReady', label: 'Inference pool ready' },
      { type: 'SchedulerWorkloadReady', label: 'Scheduler workload ready' },
    ],
  },
];

const buildConditionFromRaw = (
  rawConditions: NonNullable<LLMInferenceServiceKind['status']>['conditions'],
  spec: { type: string; label: string },
): DeploymentCondition | undefined => {
  const conditions = rawConditions ?? [];
  const raw = conditions.find((c) => c.type === spec.type);
  if (!raw) {
    return undefined;
  }
  if (raw.reason === 'Stopped') {
    return undefined;
  }
  return {
    type: raw.type ?? spec.type,
    label: spec.label,
    status: toConditionStatus(raw.status),
    reason: raw.reason,
    message: raw.status === 'False' ? raw.message : undefined,
    lastTransitionTime: raw.lastTransitionTime,
  };
};

export const getLLMdDeploymentConditions = (
  inferenceService: LLMInferenceServiceKind,
): DeploymentCondition[] => {
  const rawConditions = inferenceService.status?.conditions;
  const conditions: DeploymentCondition[] = [
    {
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: inferenceService.metadata.creationTimestamp,
    },
  ];

  for (const spec of LLMD_CONDITION_SPECS) {
    const parentCondition = buildConditionFromRaw(rawConditions, spec);
    if (!parentCondition) {
      continue;
    }

    if (spec.children) {
      const children: DeploymentCondition[] = [];
      for (const childSpec of spec.children) {
        const child = buildConditionFromRaw(rawConditions, childSpec);
        if (child) {
          children.push(child);
        }
      }
      if (children.length > 0) {
        parentCondition.children = children;
      }
    }

    conditions.push(parentCondition);
  }

  const readyRaw = (rawConditions ?? []).find((c) => c.type === 'Ready');
  if (readyRaw) {
    if (readyRaw.reason === 'Stopped') {
      conditions.push({
        type: 'Stopped',
        label: 'Deployment stopped',
        status: 'True',
        reason: readyRaw.reason,
        message: readyRaw.message,
        lastTransitionTime: readyRaw.lastTransitionTime,
      });
    } else {
      conditions.push({
        type: 'Ready',
        label: 'Deployment ready',
        status: toConditionStatus(readyRaw.status),
        reason: readyRaw.reason,
        message: readyRaw.status === 'False' ? readyRaw.message : undefined,
        lastTransitionTime: readyRaw.lastTransitionTime,
      });
    }
  }

  return conditions;
};

export const getLLMdDeploymentStatus = (
  inferenceService: LLMInferenceServiceKind,
  deploymentPods: PodKind[],
): DeploymentStatus => {
  const deploymentPod = deploymentPods.length > 0 ? deploymentPods[0] : undefined;

  const modelPodStatus = deploymentPod ? checkModelPodStatus(deploymentPod) : undefined;

  const state = getLLMInferenceServiceModelState(inferenceService, modelPodStatus);
  const message = getLLMInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  const stoppedStates = getModelDeploymentStoppedStates(
    state,
    inferenceService.metadata.annotations,
    deploymentPod,
  );

  const conditions = getLLMdDeploymentConditions(inferenceService);

  return { state, message, stoppedStates, conditions };
};

export const patchDeploymentStoppedStatus = (
  deployment: LLMdDeployment,
  isStopped: boolean,
): Promise<LLMdDeployment['model']> =>
  k8sPatchResource({
    model: LLMInferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations/serving.kserve.io~1stop',
        value: isStopped ? 'true' : 'false',
      },
    ],
  });

export const getLLMInferenceServiceModelState = (
  is: LLMInferenceServiceKind,
  modelPodStatus?: ModelStatus | null,
): ModelDeploymentState => {
  const readyCondition = is.status?.conditions?.find((condition) => condition.type === 'Ready');
  if (modelPodStatus?.failedToSchedule) {
    return ModelDeploymentState.FAILED_TO_LOAD;
  }
  switch (readyCondition?.status) {
    case 'False':
      if (
        readyCondition.reason === LLMInferenceServiceReadyConditionReason.PROGRESS_DEADLINE_EXCEEDED
      ) {
        return ModelDeploymentState.FAILED_TO_LOAD;
      }
      if (readyCondition.reason === LLMInferenceServiceReadyConditionReason.STOPPED) {
        // if the service is actually stopped it overrides this, checking for stopped here prevents a false failure while the status is updating after hitting start
        return ModelDeploymentState.PENDING;
      }
      return ModelDeploymentState.PENDING;
    case 'True':
      return ModelDeploymentState.LOADED;
    default:
      return ModelDeploymentState.UNKNOWN;
  }
};

export const getLLMInferenceServiceStatusMessage = (
  is: LLMInferenceServiceKind,
  modelPodStatus?: ModelStatus | null,
): string => {
  if (modelPodStatus?.failedToSchedule) {
    return modelPodStatus.failureMessage || 'Insufficient resources';
  }
  const stateMessage =
    is.status?.conditions?.find((condition) => condition.type === 'Ready')?.message ?? 'Unknown';

  return stateMessage;
};
