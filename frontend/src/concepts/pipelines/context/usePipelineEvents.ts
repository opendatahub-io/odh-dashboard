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
  podUid: string,
): CustomWatchK8sResult<EventKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
      fieldSelector: `involvedObject.kind=Pod,involvedObject.uid=${podUid}`,
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
export const useWatchMultiplePodEvents = (namespace: string, podUids: string[]): EventKind[] => {
  // Determine how many pods to watch (up to a reasonable limit to prevent performance issues)
  const maxPodsToWatch = 20; // Increased from 10 to handle more pods
  const podsToWatch = Math.min(podUids.length, maxPodsToWatch);

  // Call hooks at the top level for each possible pod index
  const pod0Events = useWatchPipelineServerEvents(namespace, podUids[0] ?? '');
  const pod1Events = useWatchPipelineServerEvents(namespace, podUids[1] ?? '');
  const pod2Events = useWatchPipelineServerEvents(namespace, podUids[2] ?? '');
  const pod3Events = useWatchPipelineServerEvents(namespace, podUids[3] ?? '');
  const pod4Events = useWatchPipelineServerEvents(namespace, podUids[4] ?? '');
  const pod5Events = useWatchPipelineServerEvents(namespace, podUids[5] ?? '');
  const pod6Events = useWatchPipelineServerEvents(namespace, podUids[6] ?? '');
  const pod7Events = useWatchPipelineServerEvents(namespace, podUids[7] ?? '');
  const pod8Events = useWatchPipelineServerEvents(namespace, podUids[8] ?? '');
  const pod9Events = useWatchPipelineServerEvents(namespace, podUids[9] ?? '');
  const pod10Events = useWatchPipelineServerEvents(namespace, podUids[10] ?? '');
  const pod11Events = useWatchPipelineServerEvents(namespace, podUids[11] ?? '');
  const pod12Events = useWatchPipelineServerEvents(namespace, podUids[12] ?? '');
  const pod13Events = useWatchPipelineServerEvents(namespace, podUids[13] ?? '');
  const pod14Events = useWatchPipelineServerEvents(namespace, podUids[14] ?? '');
  const pod15Events = useWatchPipelineServerEvents(namespace, podUids[15] ?? '');
  const pod16Events = useWatchPipelineServerEvents(namespace, podUids[16] ?? '');
  const pod17Events = useWatchPipelineServerEvents(namespace, podUids[17] ?? '');
  const pod18Events = useWatchPipelineServerEvents(namespace, podUids[18] ?? '');
  const pod19Events = useWatchPipelineServerEvents(namespace, podUids[19] ?? '');

  return React.useMemo(() => {
    // Create an array of all pod event results
    const allPodEventArrays = [
      pod0Events[0],
      pod1Events[0],
      pod2Events[0],
      pod3Events[0],
      pod4Events[0],
      pod5Events[0],
      pod6Events[0],
      pod7Events[0],
      pod8Events[0],
      pod9Events[0],
      pod10Events[0],
      pod11Events[0],
      pod12Events[0],
      pod13Events[0],
      pod14Events[0],
      pod15Events[0],
      pod16Events[0],
      pod17Events[0],
      pod18Events[0],
      pod19Events[0],
    ];

    // Only use the events for pods that actually exist
    const validPodEventArrays = allPodEventArrays.slice(0, podsToWatch);

    // Flatten and sort all events by timestamp
    return validPodEventArrays.flat().toSorted((a, b) => {
      const timeA = new Date(a.lastTimestamp ?? a.eventTime).getTime();
      const timeB = new Date(b.lastTimestamp ?? b.eventTime).getTime();
      return timeA - timeB;
    });
  }, [
    pod0Events,
    pod1Events,
    pod2Events,
    pod3Events,
    pod4Events,
    pod5Events,
    pod6Events,
    pod7Events,
    pod8Events,
    pod9Events,
    pod10Events,
    pod11Events,
    pod12Events,
    pod13Events,
    pod14Events,
    pod15Events,
    pod16Events,
    pod17Events,
    pod18Events,
    pod19Events,
    podsToWatch,
  ]);
};
