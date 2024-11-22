import { EventKind, NotebookKind } from '~/k8sTypes';
import { EventStatus, NotebookSize, NotebookStatus } from '~/types';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import { useWatchNotebookEvents } from '~/api';

export const hasStopAnnotation = (notebook: NotebookKind): boolean =>
  !!(
    notebook.metadata.annotations?.['kubeflow-resource-stopped'] &&
    notebook.metadata.annotations['kubeflow-resource-stopped'] !== 'odh-notebook-controller-lock'
  );

export const getNotebookPVCVolumeNames = (notebook: NotebookKind): { [name: string]: string } =>
  (notebook.spec.template.spec.volumes || []).reduce((acc, volume) => {
    if (!volume.persistentVolumeClaim?.claimName) {
      return acc;
    }

    return {
      ...acc,
      [volume.name]: volume.persistentVolumeClaim.claimName,
    };
  }, {});

export const getNotebookPVCMountPathMap = (
  notebook?: NotebookKind,
): { [claimName: string]: string } => {
  if (!notebook) {
    return {};
  }

  const pvcVolumeNames = getNotebookPVCVolumeNames(notebook);

  return notebook.spec.template.spec.containers.reduce(
    (acc, container) => ({
      ...acc,
      ...(container.volumeMounts || []).reduce((innerAcc, volumeMount) => {
        const claimName = pvcVolumeNames[volumeMount.name];
        if (!claimName) {
          return innerAcc;
        }

        return { ...innerAcc, [claimName]: volumeMount.mountPath || '/ ' };
      }, {}),
    }),
    {},
  );
};

export const getEventTimestamp = (event: EventKind): string =>
  event.lastTimestamp || event.eventTime;

const filterEvents = (
  allEvents: EventKind[],
  lastActivity: Date,
): [filterEvents: EventKind[], thisInstanceEvents: EventKind[], gracePeriod: boolean] => {
  const thisInstanceEvents = allEvents
    .filter((event) => new Date(getEventTimestamp(event)) >= lastActivity)
    .toSorted((a, b) => getEventTimestamp(a).localeCompare(getEventTimestamp(b)));
  if (thisInstanceEvents.length === 0) {
    // Filtered out all of the events, exit early
    return [[], [], false];
  }

  let filteredEvents = thisInstanceEvents;

  const now = Date.now();
  let gracePeriod = false;

  // Ignore the rest of the filter logic if we pass 20 minutes
  const maxCap = new Date(lastActivity).setMinutes(lastActivity.getMinutes() + 20);
  if (now <= maxCap) {
    // Haven't hit the cap yet, filter events for accepted scenarios
    const infoEvents = filteredEvents.filter((event) => event.type === 'Normal');
    const idleTime = new Date(lastActivity).setSeconds(lastActivity.getSeconds() + 30);
    gracePeriod = idleTime - now > 0;

    // Suppress the warnings when we are idling
    if (gracePeriod) {
      filteredEvents = infoEvents;
    }

    // If we are scaling up, we want to focus on that
    const hasScaleUp = infoEvents.some((event) => event.reason === 'TriggeredScaleUp');
    if (hasScaleUp) {
      // Scaling up event is present -- look for issues with it
      const hasScaleUpIssueIndex = thisInstanceEvents.findIndex(
        (event) => event.reason === 'NotTriggerScaleUp',
      );
      if (hasScaleUpIssueIndex >= 0) {
        // Has scale up issue, show that
        filteredEvents = [thisInstanceEvents[hasScaleUpIssueIndex]];
      } else {
        // Haven't hit a failure in scale up, show just infos
        filteredEvents = infoEvents;
      }
    }
  }

  return [filteredEvents, thisInstanceEvents, gracePeriod];
};

export const useNotebookStatus = (
  notebook: NotebookKind,
  podUid: string,
  spawnInProgress: boolean,
): [status: NotebookStatus | null, events: EventKind[]] => {
  const [events] = useWatchNotebookEvents(
    notebook.metadata.namespace,
    notebook.metadata.name,
    podUid,
  );

  const annotationTime = notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'];
  const lastActivity = annotationTime
    ? new Date(annotationTime)
    : spawnInProgress || podUid
    ? new Date(notebook.metadata.creationTimestamp ?? 0)
    : null;

  if (!lastActivity) {
    // Notebook not started, we don't have a filter time, ignore
    return [null, []];
  }

  const [filteredEvents, thisInstanceEvents, gracePeriod] = filterEvents(events, lastActivity);
  if (filteredEvents.length === 0) {
    return [null, thisInstanceEvents];
  }

  // Parse the last event
  let percentile = 0;
  let status: EventStatus = EventStatus.IN_PROGRESS;
  const lastItem = filteredEvents[filteredEvents.length - 1];
  let currentEvent = '';
  if (lastItem.message.includes('oauth-proxy')) {
    switch (lastItem.reason) {
      case 'Pulling': {
        currentEvent = 'Pulling oauth proxy';
        percentile = 72;
        break;
      }
      case 'Pulled': {
        currentEvent = 'Oauth proxy pulled';
        percentile = 80;
        break;
      }
      case 'Created': {
        currentEvent = 'Oauth proxy container created';
        percentile = 88;
        break;
      }
      case 'Started': {
        currentEvent = 'Oauth proxy container started';
        percentile = 96;
        break;
      }
      case 'Killing': {
        currentEvent = 'Stopping container oauth-proxy';
        status = EventStatus.WARNING;
        break;
      }
      default: {
        if (lastItem.type === 'Warning') {
          currentEvent = 'Issue creating oauth proxy container';
          status = EventStatus.WARNING;
        }
      }
    }
  } else {
    switch (lastItem.reason) {
      case 'SuccessfulCreate': {
        currentEvent = 'Pod created';
        percentile = 8;
        break;
      }
      case 'Scheduled': {
        currentEvent = 'Pod assigned';
        percentile = 16;
        break;
      }
      case 'SuccessfulAttachVolume': {
        currentEvent = 'PVC attached';
        percentile = 24;
        break;
      }
      case 'AddedInterface': {
        currentEvent = 'Interface added';
        percentile = 32;
        break;
      }
      case 'Pulling': {
        currentEvent = 'Pulling notebook image';
        percentile = 40;
        break;
      }
      case 'Pulled': {
        currentEvent = 'Notebook image pulled';
        percentile = 48;
        break;
      }
      case 'Created': {
        currentEvent = 'Notebook container created';
        percentile = 56;
        break;
      }
      case 'Started': {
        currentEvent = 'Notebook container started';
        percentile = 64;
        break;
      }
      case 'NotTriggerScaleUp':
        currentEvent = 'Failed to scale-up';
        status = EventStatus.ERROR;
        break;
      case 'TriggeredScaleUp': {
        currentEvent = 'Pod triggered scale-up';
        status = EventStatus.INFO;
        break;
      }
      case 'FailedCreate': {
        currentEvent = 'Failed to create pod';
        status = EventStatus.ERROR;
        break;
      }
      default: {
        if (!gracePeriod && lastItem.reason === 'FailedScheduling') {
          currentEvent = 'Insufficient resources to start';
          status = EventStatus.ERROR;
        } else if (!gracePeriod && lastItem.reason === 'BackOff') {
          currentEvent = 'ImagePullBackOff';
          status = EventStatus.ERROR;
        } else if (lastItem.type === 'Warning') {
          currentEvent = 'Issue creating notebook container';
          status = EventStatus.WARNING;
        }
      }
    }
  }

  return [
    {
      percentile,
      currentEvent,
      currentEventReason: lastItem.reason,
      currentEventDescription: lastItem.message,
      currentStatus: status,
    },
    thisInstanceEvents,
  ];
};

export const getEventFullMessage = (event: EventKind): string =>
  `${getEventTimestamp(event)} [${event.type}] ${event.message}`;

export const fireNotebookTrackingEvent = (
  action: 'started' | 'stopped',
  notebook: NotebookKind,
  size: NotebookSize | null,
  acceleratorProfile: AcceleratorProfileState,
): void => {
  fireFormTrackingEvent(`Workbench ${action === 'started' ? 'Started' : 'Stopped'}`, {
    outcome: TrackingOutcome.submit,
    acceleratorCount: acceleratorProfile.unknownProfileDetected
      ? undefined
      : acceleratorProfile.count,
    accelerator: acceleratorProfile.acceleratorProfile
      ? `${acceleratorProfile.acceleratorProfile.spec.displayName} (${acceleratorProfile.acceleratorProfile.metadata.name}): ${acceleratorProfile.acceleratorProfile.spec.identifier}`
      : acceleratorProfile.unknownProfileDetected
      ? 'Unknown'
      : 'None',
    lastSelectedSize:
      size?.name || notebook.metadata.annotations?.['notebooks.opendatahub.io/last-size-selection'],
    lastSelectedImage:
      notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection'],
    projectName: notebook.metadata.namespace,
    notebookName: notebook.metadata.name,
    ...(action === 'stopped' && {
      lastActivity: notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'],
    }),
  });
};
