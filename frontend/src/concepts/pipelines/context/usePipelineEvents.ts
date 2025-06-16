import * as React from 'react';
import { groupVersionKind } from '#~/api/k8sUtils';
import { EventKind, KnownLabels } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { EventModel, PodModel } from '#~/api/models/k8s';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

// want use watch many.........react query supports this and we do not unfortunately
// want to have one call per pod; and manage them.......
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

// Custom hook to watch events for multiple pods
export const useWatchMultiplePodEvents = (namespace: string, podUids: string[]): EventKind[] => {
  // Always call hooks to maintain consistent order, but use empty string for non-existent pods
  // This will result in empty event arrays for non-existent pods
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

  return React.useMemo(() => {
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
    ];

    return allPodEventArrays.flat().toSorted((a, b) => {
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
  ]);
};
