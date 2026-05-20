import React from 'react';
import type { InferenceServiceKind, EventKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
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
import type { KServeDeployment } from './deployments';

const isStorageInitializerEvent = (event: EventKind): boolean =>
  event.message.includes('storage-initializer');

const isKServeContainerEvent = (event: EventKind): boolean =>
  event.message.includes('kserve-container');

const isAuthProxyEvent = (event: EventKind): boolean =>
  event.message.includes('kube-rbac-proxy') || event.message.includes('oauth-proxy');

const hasEventWithReason = (events: EventKind[], reason: string): boolean =>
  events.some((e) => e.reason === reason);

const hasContainerEvent = (
  events: EventKind[],
  reason: string,
  containerCheck: (e: EventKind) => boolean,
): boolean => events.some((e) => e.reason === reason && containerCheck(e));

type ConditionInfo = {
  status: string;
  reason: string | undefined;
  message: string | undefined;
};

const getConditionStatus = (
  isvc: InferenceServiceKind,
  conditionType: string,
): ConditionInfo | undefined => {
  const conditions = isvc.status?.conditions;
  if (!conditions) {
    return undefined;
  }
  const condition = conditions.find((c) => c.type === conditionType);
  if (!condition) {
    return undefined;
  }
  return {
    status: condition.status,
    reason:
      'reason' in condition && typeof condition.reason === 'string' ? condition.reason : undefined,
    message:
      'message' in condition && typeof condition.message === 'string'
        ? condition.message
        : undefined,
  };
};

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

export const useKServeProgressSteps = (deployment: KServeDeployment): DeploymentProgressStep[] => {
  const { model: isvc } = deployment;
  const { namespace, name } = isvc.metadata;

  const [allEvents] = useWatchDeploymentEvents(namespace);

  const [allPods] = useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
    },
    PodModel,
  );

  const deploymentPods = React.useMemo(
    () => allPods.filter((pod) => pod.metadata.name.startsWith(`${name}-predictor-`)),
    [allPods, name],
  );

  const readyPodCount = React.useMemo(
    () => deploymentPods.filter(isPodReady).length,
    [deploymentPods],
  );
  const totalPodCount = deploymentPods.length;
  const desiredReplicas = isvc.spec.predictor.minReplicas ?? 1;

  const podEvents = React.useMemo(
    () => filterDeploymentEvents(allEvents, name, new Set(['pod'])),
    [allEvents, name],
  );

  const sortedPodEvents = React.useMemo(
    () =>
      podEvents.toSorted(
        (a, b) =>
          new Date(getEventTimestamp(a)).getTime() - new Date(getEventTimestamp(b)).getTime(),
      ),
    [podEvents],
  );

  return React.useMemo(() => {
    const isStopped = isvc.metadata.annotations?.['serving.kserve.io/stop'] === 'true';
    const modelState =
      isvc.status?.modelStatus?.states?.targetModelState ??
      isvc.status?.modelStatus?.states?.activeModelState ??
      '';
    const readyCondition = getConditionStatus(isvc, 'Ready');
    const predictorCondition = getConditionStatus(isvc, 'PredictorReady');
    const ingressCondition = getConditionStatus(isvc, 'IngressReady');

    const isPredictorReady = predictorCondition?.status === 'True';
    const isReady = readyCondition?.status === 'True';
    const isIngressReady = ingressCondition?.status === 'True';
    const isModelLoaded = modelState === 'Loaded';
    const isModelFailed = modelState === 'FailedToLoad';
    const isProgressDeadlineExceeded = predictorCondition?.reason === 'ProgressDeadlineExceeded';

    // Events expire after ~1 hour. When the predictor is already ready,
    // infer that all sub-steps completed even if their events are gone.
    const inferFromCondition = isPredictorReady || isModelLoaded;

    const podScheduled = hasEventWithReason(sortedPodEvents, 'Scheduled') || inferFromCondition;
    const podScheduleFailed =
      !inferFromCondition && hasEventWithReason(sortedPodEvents, 'FailedScheduling');

    const storageInitDone =
      hasContainerEvent(sortedPodEvents, 'Started', isStorageInitializerEvent) ||
      inferFromCondition;
    const storageInitFailed =
      !inferFromCondition &&
      sortedPodEvents.some((e) => e.reason === 'BackOff' && isStorageInitializerEvent(e));

    const kserveContainerStarted =
      hasContainerEvent(sortedPodEvents, 'Started', isKServeContainerEvent) || inferFromCondition;
    const kserveContainerFailed =
      !inferFromCondition &&
      sortedPodEvents.some(
        (e) => (e.reason === 'BackOff' || e.reason === 'Unhealthy') && isKServeContainerEvent(e),
      );

    const authProxyStarted =
      hasContainerEvent(sortedPodEvents, 'Started', isAuthProxyEvent) || inferFromCondition;

    const deploymentRequestedStatus: DeploymentProgressStepStatus = isStopped
      ? 'pending'
      : 'success';

    const modelResourcesChildren: DeploymentProgressStep[] = [
      {
        id: 'pod-scheduled',
        title: 'Pod scheduled',
        status: stepStatus(podScheduled, podScheduleFailed),
        description: podScheduleFailed
          ? sortedPodEvents.find((e) => e.reason === 'FailedScheduling')?.message
          : undefined,
      },
      {
        id: 'model-downloaded',
        title: 'Model downloaded',
        status: stepStatus(storageInitDone, storageInitFailed),
      },
      {
        id: 'model-server-started',
        title: 'Model server started',
        status: stepStatus(kserveContainerStarted, kserveContainerFailed),
        description: isModelFailed ? isvc.status?.modelStatus?.lastFailureInfo?.message : undefined,
      },
      {
        id: 'auth-proxy-started',
        title: 'Auth proxy started',
        status: stepStatus(authProxyStarted, false),
      },
    ];

    const allModelResourcesReady = modelResourcesChildren.every((s) => s.status === 'success');
    const anyModelResourceFailed = modelResourcesChildren.some((s) => s.status === 'danger');

    const allReplicasReady = readyPodCount >= desiredReplicas && desiredReplicas > 0;
    const modelResourcesReady =
      allModelResourcesReady && (desiredReplicas <= 1 || allReplicasReady);
    const replicaDescription = (() => {
      if (predictorCondition?.reason === 'ProgressDeadlineExceeded') {
        return predictorCondition.message;
      }
      if (desiredReplicas > 1 && totalPodCount > 0) {
        return `${readyPodCount}/${desiredReplicas} pods ready`;
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
        id: 'model-resources',
        title: 'Model resources',
        status: stepStatus(
          modelResourcesReady,
          anyModelResourceFailed || Boolean(isProgressDeadlineExceeded),
        ),
        description: replicaDescription,
        children: modelResourcesChildren,
      },
      {
        id: 'model-loaded',
        title: 'Model loaded',
        status: stepStatus(isModelLoaded, isModelFailed),
        description: isModelFailed ? isvc.status?.modelStatus?.lastFailureInfo?.reason : undefined,
      },
      {
        id: 'ingress-ready',
        title: 'Ingress ready',
        status: stepStatus(isIngressReady, false),
      },
      {
        id: 'deployment-ready',
        title: 'Deployment ready',
        status: stepStatus(isReady, readyCondition?.status === 'False' && !isStopped),
        description: readyCondition?.status === 'False' ? readyCondition.message : undefined,
      },
    ];
  }, [isvc, sortedPodEvents, readyPodCount, totalPodCount, desiredReplicas]);
};
