import * as React from 'react';
import { groupVersionKind } from '#~/api/k8sUtils';
import { EventKind, KnownLabels } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { EventModel, PodModel } from '#~/api/models/k8s';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

// ideally ,would use react-query watch many, but that is not available
//react query supports this and we do not unfortunately
// need to have one call per pod because react hooks need to be called the same amount of times for each rendering
// TECH DEBT
export const useWatchPipelineServerEvents = (
  namespace: string,
): CustomWatchK8sResult<EventKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
      fieldSelector: 'involvedObject.kind=Pod',
    },
    EventModel,
  );

export const useWatchPodsForPipelineServerEvents = (
  namespace: string,
): CustomWatchK8sResult<EventKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
      selector: { matchLabels: { component: KnownLabels.LABEL_SELECTOR_DATA_SCIENCE_PIPELINES } },
    },
    PodModel,
  );

// Custom hook to watch events for multiple pods dynamically
export const useWatchAllPodEventsAndFilter = (
  namespace: string,
  podUids: string[],
): EventKind[] => {
  // get ALL the events
  const [podEvents] = useWatchPipelineServerEvents(namespace);
  console.log('podEvents-22a', podEvents);
  const filteredEvents = podEvents.filter(
    (event) => event.metadata.uid && podUids.includes(event.metadata.uid),
  );

  console.log('filteredEvents-22b', filteredEvents);

  return React.useMemo(
    () =>
      // Sort events by timestamp
      filteredEvents.toSorted((a, b) => {
        const timeA = new Date(a.lastTimestamp ?? a.eventTime).getTime();
        const timeB = new Date(b.lastTimestamp ?? b.eventTime).getTime();
        return timeA - timeB;
      }),
    [filteredEvents],
  );
};
