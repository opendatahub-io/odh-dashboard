import { EventKind } from '@odh-dashboard/internal/k8sTypes';
import { EventModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';

export const useWatchDeploymentEvents = (namespace: string): CustomWatchK8sResult<EventKind[]> =>
  useK8sWatchResourceList<EventKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
    },
    EventModel,
  );

export const getEventTimestamp = (event: EventKind): string =>
  event.lastTimestamp || event.eventTime;

export const getEventFullMessage = (event: EventKind): string =>
  `${getEventTimestamp(event)} [${event.reason}] [${event.type}] ${event.message}`;

export type EventFilter = {
  label: string;
  id: string;
  match: (event: EventKind) => boolean;
};

export const getDeploymentEventFilters = (deploymentName: string): EventFilter[] => [
  {
    id: 'cr',
    label: 'Deployment CR',
    match: (event) =>
      (event.involvedObject.kind === 'InferenceService' ||
        event.involvedObject.kind === 'LLMInferenceService' ||
        event.involvedObject.kind === 'NIMService') &&
      event.involvedObject.name === deploymentName,
  },
  {
    id: 'pod',
    label: 'Pods',
    match: (event) =>
      event.involvedObject.kind === 'Pod' &&
      event.involvedObject.name.startsWith(`${deploymentName}-`),
  },
  {
    id: 'deployment',
    label: 'Deployments',
    match: (event) =>
      event.involvedObject.kind === 'Deployment' &&
      event.involvedObject.name.startsWith(`${deploymentName}-`),
  },
  {
    id: 'replicaset',
    label: 'ReplicaSets',
    match: (event) =>
      event.involvedObject.kind === 'ReplicaSet' &&
      event.involvedObject.name.startsWith(`${deploymentName}-`),
  },
  {
    id: 'hpa',
    label: 'Autoscalers',
    match: (event) =>
      event.involvedObject.kind === 'HorizontalPodAutoscaler' &&
      event.involvedObject.name.startsWith(`${deploymentName}-`),
  },
];

export const filterDeploymentEvents = (
  events: EventKind[],
  deploymentName: string,
  activeFilterIds: Set<string>,
): EventKind[] => {
  const filters = getDeploymentEventFilters(deploymentName);
  const activeFilters = filters.filter((f) => activeFilterIds.has(f.id));
  if (activeFilters.length === 0) {
    return [];
  }
  return events.filter((event) => activeFilters.some((f) => f.match(event)));
};
