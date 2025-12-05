import { genUID } from '@odh-dashboard/internal/__mocks__/mockUtils';
import { EventKind } from '@odh-dashboard/internal/k8sTypes';

type MockEventResourceConfigType = {
  name?: string;
  namespace?: string;
  involvedObjectName: string;
  involvedObjectKind?: string;
  involvedObjectUid?: string;
  type?: 'Normal' | 'Warning';
  reason?: string;
  message?: string;
  eventTime?: string;
  lastTimestamp?: string;
  creationTimestamp?: string;
};

/**
 * Creates a mock Kubernetes Event resource
 */
export const mockEventK8sResource = ({
  name,
  namespace = 'test-project',
  involvedObjectName,
  involvedObjectKind,
  involvedObjectUid,
  type = 'Normal',
  reason = 'Created',
  message = 'Resource created',
  eventTime,
  lastTimestamp,
  creationTimestamp,
}: MockEventResourceConfigType): EventKind => {
  const timestamp = eventTime || lastTimestamp || creationTimestamp || new Date().toISOString();
  const eventName = name || `${involvedObjectName}-${reason.toLowerCase()}-${Date.now()}`;

  return {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      name: eventName,
      namespace,
      uid: genUID(`event-${eventName}`),
      creationTimestamp: creationTimestamp || timestamp,
      resourceVersion: '1',
    },
    involvedObject: {
      name: involvedObjectName,
      kind: involvedObjectKind,
      uid: involvedObjectUid,
    },
    eventTime: timestamp,
    lastTimestamp: lastTimestamp || timestamp,
    type,
    reason,
    message,
  };
};

/**
 * Creates mock events for a TrainJob and related resources (Workload, JobSet)
 */
export const createMockEventsForTrainJob = (
  trainJobName: string,
  namespace: string,
  trainJobUid?: string,
  workloadName?: string,
  workloadUid?: string,
): EventKind[] => {
  const events: EventKind[] = [];

  // Event for TrainJob
  events.push(
    mockEventK8sResource({
      name: `${trainJobName}-trainjob-created`,
      namespace,
      involvedObjectName: trainJobName,
      involvedObjectUid: trainJobUid,
      type: 'Normal',
      reason: 'Created',
      message: `TrainJob ${trainJobName} created`,
    }),
  );

  // Event for Workload (if workload exists)
  if (workloadName) {
    events.push(
      mockEventK8sResource({
        name: `${workloadName}-workload-admitted`,
        namespace,
        involvedObjectName: workloadName,
        involvedObjectKind: 'Workload',
        involvedObjectUid: workloadUid,
        type: 'Normal',
        reason: 'Admitted',
        message: `Workload ${workloadName} admitted`,
      }),
    );
  }

  // Event for JobSet
  events.push(
    mockEventK8sResource({
      name: `${trainJobName}-jobset-created`,
      namespace,
      involvedObjectName: trainJobName,
      involvedObjectKind: 'JobSet',
      involvedObjectUid: trainJobUid,
      type: 'Normal',
      reason: 'Created',
      message: `JobSet ${trainJobName} created`,
    }),
  );

  return events;
};
