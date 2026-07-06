import * as React from 'react';
import { EventKind } from '@odh-dashboard/internal/k8sTypes';
import { EventModel } from '@odh-dashboard/internal/api/models/k8s';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';

/**
 * Watch events for TrainJob and related resources (Workload, JobSet, Jobs, Pods)
 * This fetches all events related to a TrainJob by using multiple field selectors
 */
export const useWatchTrainJobEvents = (
  namespace: string,
  trainJobName: string,
  workloadName?: string,
): CustomWatchK8sResult<EventKind[]> => {
  const [trainJobEvents, trainJobLoaded] = useK8sWatchResourceList<EventKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
      fieldSelector: `involvedObject.name=${trainJobName}`,
    },
    EventModel,
  );

  // Fetch events for Workload if available
  const workloadResource = React.useMemo(
    () =>
      workloadName
        ? {
            isList: true,
            groupVersionKind: groupVersionKind(EventModel),
            namespace,
            fieldSelector: `involvedObject.kind=Workload,involvedObject.name=${workloadName}`,
          }
        : null,
    [namespace, workloadName],
  );
  const [workloadEvents, workloadLoaded] = useK8sWatchResourceList<EventKind[]>(
    workloadResource,
    EventModel,
  );

  const [jobsetEvents, jobsetLoaded] = useK8sWatchResourceList<EventKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
      fieldSelector: `involvedObject.kind=JobSet,involvedObject.name=${trainJobName}`,
    },
    EventModel,
  );

  const allEvents = React.useMemo(() => {
    const eventMap = new Map<string, EventKind>();
    const eventsToProcess = [
      ...(Array.isArray(trainJobEvents) ? trainJobEvents : []),
      ...(Array.isArray(workloadEvents) ? workloadEvents : []),
      ...(Array.isArray(jobsetEvents) ? jobsetEvents : []),
    ];

    eventsToProcess.forEach((event) => {
      const key =
        event.metadata.uid ||
        `${event.metadata.name || 'unknown'}-${event.lastTimestamp || 'unknown'}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    });

    return Array.from(eventMap.values());
  }, [trainJobEvents, workloadEvents, jobsetEvents]);

  const loaded = React.useMemo(() => {
    return trainJobLoaded && jobsetLoaded && (workloadName ? workloadLoaded : true);
  }, [trainJobLoaded, jobsetLoaded, workloadLoaded, workloadName]);

  return [allEvents, loaded, undefined];
};
