import React from 'react';
import type { EventKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import type {
  DeploymentProgressStep,
  DeploymentProgressStepStatus,
} from '@odh-dashboard/model-serving/extension-points';
import {
  useWatchDeploymentEvents,
  filterDeploymentEvents,
  getEventTimestamp,
} from '@odh-dashboard/model-serving/concepts/useWatchDeploymentEvents';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

const getCondition = (
  llmisvc: LLMInferenceServiceKind,
  conditionType: string,
): { status?: string; reason?: string; message?: string } | undefined =>
  llmisvc.status?.conditions?.find((c) => c.type === conditionType);

const conditionToStatus = (
  condition: { status?: string; reason?: string; message?: string } | undefined,
): DeploymentProgressStepStatus => {
  if (!condition) {
    return 'pending';
  }
  if (condition.status === 'True') {
    return 'success';
  }
  if (condition.reason === 'ProgressDeadlineExceeded') {
    return 'danger';
  }
  if (condition.reason === 'Stopped') {
    return 'pending';
  }
  return 'pending';
};

const getResourceCreatedSteps = (crEvents: EventKind[]): DeploymentProgressStep[] => {
  const createdEvents = crEvents.filter((e) => e.reason === 'Created');
  if (createdEvents.length === 0) {
    return [];
  }

  const sorted = createdEvents.toSorted(
    (a, b) => new Date(getEventTimestamp(a)).getTime() - new Date(getEventTimestamp(b)).getTime(),
  );

  const successStatus: DeploymentProgressStepStatus = 'success';
  return sorted.map((event, index) => ({
    id: `resource-created-${index}`,
    title: event.message,
    status: successStatus,
  }));
};

const isModelPodEvent = (event: EventKind, deploymentName: string): boolean =>
  event.involvedObject.kind === 'Pod' &&
  event.involvedObject.name.startsWith(`${deploymentName}-kserve-`) &&
  !event.involvedObject.name.includes('router-scheduler');

const isRouterPodEvent = (event: EventKind, deploymentName: string): boolean =>
  event.involvedObject.kind === 'Pod' &&
  event.involvedObject.name.includes(`${deploymentName}-kserve-router-scheduler-`);

const hasEventReason = (events: EventKind[], reason: string): boolean =>
  events.some((e) => e.reason === reason);

const hasPodStarted = (events: EventKind[], containerName: string): boolean =>
  events.some((e) => e.reason === 'Started' && e.message.includes(containerName));

const hasPodFailed = (events: EventKind[], containerName: string): boolean =>
  events.some(
    (e) =>
      (e.reason === 'BackOff' || e.reason === 'Unhealthy') && e.message.includes(containerName),
  );

const stepStatus = (ready: boolean, error: boolean): DeploymentProgressStepStatus => {
  if (error) {
    return 'danger';
  }
  if (ready) {
    return 'success';
  }
  return 'pending';
};

const isPodReady = (pod: PodKind): boolean => {
  const containerStatuses = pod.status?.containerStatuses ?? [];
  return (
    pod.status?.phase === 'Running' &&
    containerStatuses.length > 0 &&
    containerStatuses.every((cs) => cs.ready)
  );
};

export const useLLMdProgressSteps = (deployment: LLMdDeployment): DeploymentProgressStep[] => {
  const llmisvc = deployment.model;
  const { namespace } = llmisvc.metadata;
  const { name } = llmisvc.metadata;

  const [allEvents] = useWatchDeploymentEvents(namespace);

  const [allPods] = useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
    },
    PodModel,
  );

  const modelPods = React.useMemo(
    () =>
      allPods.filter(
        (pod) =>
          pod.metadata.name.startsWith(`${name}-kserve-`) &&
          !pod.metadata.name.includes('router-scheduler'),
      ),
    [allPods, name],
  );
  const routerPods = React.useMemo(
    () => allPods.filter((pod) => pod.metadata.name.startsWith(`${name}-kserve-router-scheduler-`)),
    [allPods, name],
  );

  const modelReadyCount = React.useMemo(() => modelPods.filter(isPodReady).length, [modelPods]);
  const routerReadyCount = React.useMemo(() => routerPods.filter(isPodReady).length, [routerPods]);
  const desiredReplicas = llmisvc.spec.replicas ?? 1;

  const crEvents = React.useMemo(
    () => filterDeploymentEvents(allEvents, name, new Set(['cr'])),
    [allEvents, name],
  );

  const podEvents = React.useMemo(
    () => filterDeploymentEvents(allEvents, name, new Set(['pod'])),
    [allEvents, name],
  );

  const modelPodEvents = React.useMemo(
    () => podEvents.filter((e) => isModelPodEvent(e, name)),
    [podEvents, name],
  );

  const routerPodEvents = React.useMemo(
    () => podEvents.filter((e) => isRouterPodEvent(e, name)),
    [podEvents, name],
  );

  return React.useMemo(() => {
    const isStopped = llmisvc.metadata.annotations?.['serving.kserve.io/stop'] === 'true';
    const readyCondition = getCondition(llmisvc, 'Ready');
    const mainWorkloadCondition = getCondition(llmisvc, 'MainWorkloadReady');
    const routerCondition = getCondition(llmisvc, 'RouterReady');
    const httpRoutesCondition = getCondition(llmisvc, 'HTTPRoutesReady');
    const inferencePoolCondition = getCondition(llmisvc, 'InferencePoolReady');
    const presetsCondition = getCondition(llmisvc, 'PresetsCombined');

    const isReady = readyCondition?.status === 'True';

    const deploymentRequestedStatus: DeploymentProgressStepStatus = isStopped
      ? 'pending'
      : 'success';

    const resourceCreatedChildren = getResourceCreatedSteps(crEvents);
    // If events expired but conditions exist, resources were created
    const hasConditions = (llmisvc.status?.conditions?.length ?? 0) > 0;
    const allResourcesCreated = resourceCreatedChildren.length > 0 || hasConditions;

    // Events expire after ~1 hour. When a workload condition is already True,
    // infer that all sub-steps completed even if their events are gone.
    const mainWorkloadReady = mainWorkloadCondition?.status === 'True';
    const mainWorkloadFailed =
      mainWorkloadCondition?.reason === 'ProgressDeadlineExceeded' ||
      mainWorkloadCondition?.reason === 'MinimumReplicasUnavailable';
    const inferModelFromCondition = mainWorkloadReady;

    const routerIsReady = routerCondition?.status === 'True';
    const inferRouterFromCondition = routerIsReady;

    const modelPodScheduled =
      hasEventReason(modelPodEvents, 'Scheduled') || inferModelFromCondition;
    const modelPodScheduleFailed =
      !inferModelFromCondition && hasEventReason(modelPodEvents, 'FailedScheduling');
    const modelStorageInitDone =
      hasPodStarted(modelPodEvents, 'storage-initializer') || inferModelFromCondition;
    const modelServerStarted = hasPodStarted(modelPodEvents, 'main') || inferModelFromCondition;
    const modelServerFailed = !inferModelFromCondition && hasPodFailed(modelPodEvents, 'main');

    const routerPodScheduled =
      hasEventReason(routerPodEvents, 'Scheduled') || inferRouterFromCondition;
    const routerPodScheduleFailed =
      !inferRouterFromCondition && hasEventReason(routerPodEvents, 'FailedScheduling');
    const tokenizerStarted =
      hasPodStarted(routerPodEvents, 'tokenizer') || inferRouterFromCondition;
    const schedulerStarted = hasPodStarted(routerPodEvents, 'main') || inferRouterFromCondition;
    const schedulerFailed = !inferRouterFromCondition && hasPodFailed(routerPodEvents, 'main');

    const modelWorkloadChildren: DeploymentProgressStep[] = [
      {
        id: 'model-pod-scheduled',
        title: 'Pod scheduled',
        status: stepStatus(modelPodScheduled, modelPodScheduleFailed),
      },
      {
        id: 'model-downloaded',
        title: 'Model downloaded',
        status: stepStatus(modelStorageInitDone, false),
      },
      {
        id: 'model-server-started',
        title: 'Model server started',
        status: stepStatus(modelServerStarted, modelServerFailed),
      },
    ];

    const routerChildren: DeploymentProgressStep[] = [
      {
        id: 'router-pod-scheduled',
        title: 'Pod scheduled',
        status: stepStatus(routerPodScheduled, routerPodScheduleFailed),
      },
      {
        id: 'tokenizer-ready',
        title: 'Tokenizer ready',
        status: stepStatus(tokenizerStarted, false),
      },
      {
        id: 'scheduler-started',
        title: 'Scheduler started',
        status: stepStatus(schedulerStarted, schedulerFailed),
      },
    ];

    const allModelReplicasReady = modelReadyCount >= desiredReplicas && desiredReplicas > 0;
    const allModelWorkloadReady =
      mainWorkloadReady ||
      (modelWorkloadChildren.every((s) => s.status === 'success') &&
        (desiredReplicas <= 1 || allModelReplicasReady));
    const anyModelWorkloadFailed =
      mainWorkloadFailed || modelWorkloadChildren.some((s) => s.status === 'danger');
    const modelWorkloadDescription = (() => {
      if (mainWorkloadCondition?.message) {
        return desiredReplicas > 1 && modelPods.length > 0
          ? `${modelReadyCount}/${desiredReplicas} pods ready — ${mainWorkloadCondition.message}`
          : mainWorkloadCondition.message;
      }
      if (desiredReplicas > 1 && modelPods.length > 0) {
        return `${modelReadyCount}/${desiredReplicas} pods ready`;
      }
      return undefined;
    })();

    const routerReady = routerCondition?.status === 'True';
    const routerFailed = routerCondition?.reason === 'ProgressDeadlineExceeded';
    const anyRouterFailed = routerFailed || routerChildren.some((s) => s.status === 'danger');
    const routerDescription = (() => {
      if (routerCondition?.message) {
        return routerPods.length > 1
          ? `${routerReadyCount}/${routerPods.length} pods ready — ${routerCondition.message}`
          : routerCondition.message;
      }
      if (routerPods.length > 1) {
        return `${routerReadyCount}/${routerPods.length} pods ready`;
      }
      return undefined;
    })();

    return [
      {
        id: 'deployment-requested',
        title: 'Deployment requested',
        status: deploymentRequestedStatus,
      },
      {
        id: 'resources-created',
        title: 'Resources created',
        status: stepStatus(allResourcesCreated, false),
        children: resourceCreatedChildren.length > 0 ? resourceCreatedChildren : undefined,
      },
      {
        id: 'model-workload',
        title: 'Model workload',
        status: stepStatus(allModelWorkloadReady, anyModelWorkloadFailed),
        description: modelWorkloadDescription,
        children: modelWorkloadChildren,
      },
      {
        id: 'router-scheduler',
        title: 'Router / scheduler',
        status: stepStatus(routerReady, anyRouterFailed),
        description: routerDescription,
        children: [
          ...routerChildren,
          {
            id: 'http-routes-ready',
            title: 'HTTP routes ready',
            status: conditionToStatus(httpRoutesCondition),
          },
          {
            id: 'inference-pool-ready',
            title: 'Inference pool ready',
            status: conditionToStatus(inferencePoolCondition),
          },
        ],
      },
      {
        id: 'presets-combined',
        title: 'Presets combined',
        status: conditionToStatus(presetsCondition),
      },
      {
        id: 'deployment-ready',
        title: 'Deployment ready',
        status: stepStatus(isReady, readyCondition?.status === 'False' && !isStopped),
        description: readyCondition?.status === 'False' ? readyCondition.message : undefined,
      },
    ];
  }, [
    llmisvc,
    crEvents,
    modelPodEvents,
    routerPodEvents,
    modelPods,
    routerPods,
    modelReadyCount,
    routerReadyCount,
    desiredReplicas,
  ]);
};
