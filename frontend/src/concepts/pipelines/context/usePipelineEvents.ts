import * as React from 'react';
import { groupVersionKind } from '#~/api/k8sUtils';
import { EventKind, KnownLabels, PodKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { PodModel } from '#~/api/models/k8s';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { useWatchPodEvents } from '#~/api/k8s/events.ts';

// ideally ,would use react-query watch many, but that is not available

export const useGetAllPodsForPipelineServerEvents = (
  namespace: string,
): CustomWatchK8sResult<PodKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
      selector: { matchLabels: { component: KnownLabels.LABEL_SELECTOR_DATA_SCIENCE_PIPELINES } },
    },
    PodModel,
  );

// Custom hook to watch all the events for all the pods and filter out the events for the pods we are interested in
// this is a workaround to avoid the issue of having to watch multiple pods dynamically; since
// react necessitates that the number of hooks called is the same for each render
// we are only getting hundreds of events back; and so the filtering is not excessive and the speed is fine.
export const useWatchAllPodEventsAndFilter = (namespace: string): EventKind[] => {
  // get all the pods in the namespace
  const [pods] = useGetAllPodsForPipelineServerEvents(namespace);

  // get the uids of the pods
  const podUids = React.useMemo(() => pods.map((pod) => pod.metadata.uid), [pods]);

  // get ALL the events
  const [podEvents] = useWatchPodEvents(namespace);

  const filteredEvents = React.useMemo(
    () =>
      podEvents.filter((event) => {
        const { involvedObject } = event;
        return (
          involvedObject.kind === 'Pod' &&
          involvedObject.uid &&
          podUids.includes(involvedObject.uid)
        );
      }),
    [podEvents, podUids],
  );

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
