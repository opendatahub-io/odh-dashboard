import { NotebookState } from '#~/pages/projects/notebook/types';
import { EventStatus, NotebookStatus } from '#~/types';
import { EventKind, NotebookKind } from '#~/k8sTypes';

const fauxRefresh = (): Promise<void> =>
  new Promise((resolve) => {
    resolve();
  });

const notebook: NotebookKind = {
  apiVersion: 'kubeflow.org/v1',
  kind: 'Notebook',
  metadata: {
    annotations: {
      'notebooks.opendatahub.io/inject-oauth': 'true',
      'notebooks.opendatahub.io/last-image-selection': 'tensorflow:2024.2',
      'notebooks.opendatahub.io/last-size-selection': 'Large',
      'notebooks.opendatahub.io/oauth-logout-url':
        'http://localhost:4010/projects/testing?notebookLogout=test-workbench',
      'opendatahub.io/accelerator-name': '',
      'opendatahub.io/image-display-name': 'TensorFlow',
      'opendatahub.io/username': 'cluster-admin',
      'openshift.io/description': '',
      'openshift.io/display-name': 'Test Workbench',
    },
    creationTimestamp: '2025-01-13T14:19:10Z',
    generation: 1,
    labels: {
      app: 'test-workbench',
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/odh-managed': 'true',
      'opendatahub.io/user': 'cluster-2dadmin',
    },
    name: 'test-workbench',
    namespace: 'testing',
  },
  spec: {
    template: {
      spec: {
        containers: [
          {
            env: [],
            envFrom: [],
            image:
              'image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/tensorflow:2024.2',
            imagePullPolicy: 'Always',
            livenessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/notebook/testing/test-workbench/api',
                port: 'notebook-port',
                scheme: 'HTTP',
              },
              initialDelaySeconds: 10,
              periodSeconds: 5,
              successThreshold: 1,
              timeoutSeconds: 1,
            },
            name: 'test-workbench',
            ports: [
              {
                containerPort: 8888,
                name: 'notebook-port',
                protocol: 'TCP',
              },
            ],
            readinessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/notebook/testing/test-workbench/api',
                port: 'notebook-port',
                scheme: 'HTTP',
              },
              initialDelaySeconds: 10,
              periodSeconds: 5,
              successThreshold: 1,
              timeoutSeconds: 1,
            },
            resources: {
              limits: {
                cpu: '14',
                memory: '56Gi',
              },
              requests: {
                cpu: '7',
                memory: '56Gi',
              },
            },
            volumeMounts: [],
            workingDir: '/opt/app-root/src',
          },
          {
            env: [
              {
                name: 'NAMESPACE',
                valueFrom: {
                  fieldRef: {
                    fieldPath: 'metadata.namespace',
                  },
                },
              },
            ],
            image:
              'registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4f8d66597feeb32bb18699326029f9a71a5aca4a57679d636b876377c2e95695',
            imagePullPolicy: 'Always',
            livenessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/oauth/healthz',
                port: 'oauth-proxy',
                scheme: 'HTTPS',
              },
              initialDelaySeconds: 30,
              periodSeconds: 5,
              successThreshold: 1,
              timeoutSeconds: 1,
            },
            name: 'oauth-proxy',
            ports: [
              {
                containerPort: 8443,
                name: 'oauth-proxy',
                protocol: 'TCP',
              },
            ],
            readinessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/oauth/healthz',
                port: 'oauth-proxy',
                scheme: 'HTTPS',
              },
              initialDelaySeconds: 5,
              periodSeconds: 5,
              successThreshold: 1,
              timeoutSeconds: 1,
            },
            resources: {
              limits: {
                cpu: '100m',
                memory: '64Mi',
              },
              requests: {
                cpu: '100m',
                memory: '64Mi',
              },
            },
            volumeMounts: [
              {
                mountPath: '/etc/oauth/config',
                name: 'oauth-config',
              },
              {
                mountPath: '/etc/tls/private',
                name: 'tls-certificates',
              },
            ],
          },
        ],
        enableServiceLinks: false,
        volumes: [],
      },
    },
  },
  status: {
    conditions: [
      {
        lastProbeTime: '2025-01-22T17:10:04Z',
        lastTransitionTime: '2025-01-22T16:07:37Z',
        message:
          '0/11 nodes are available: 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/11 nodes are available: 11 No preemption victims found for incoming pod..',
        reason: 'Unschedulable',
        status: 'False',
        type: 'PodScheduled',
      },
    ],
    containerState: {},
    readyReplicas: 0,
  },
};

const initialNotebookState: NotebookState = {
  notebook,
  isStarting: true,
  isRunning: false,
  isStopping: false,
  isStopped: false,
  refresh: fauxRefresh,
  runningPodUid: '',
};

export const mockInitialStates = {
  notebookStatus: null,
  notebookState: initialNotebookState,
  events: [],
};

const failedNotebookState: NotebookState = {
  notebook,
  isStarting: true,
  isRunning: false,
  isStopping: false,
  isStopped: false,
  runningPodUid: '1f28301b-20b0-40f7-9a9f-39c66442075e',
  refresh: fauxRefresh,
};

const failedNotebookEvents: EventKind[] = [
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/11 nodes are available: 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/11 nodes are available: 11 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:07:37.383767Z',
    metadata: {
      name: 'test-workbench-0.181d0f7c358e7913',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/11 nodes are available: 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/11 nodes are available: 11 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:10:04.687682Z',
    metadata: {
      name: 'test-workbench-0.181d0f9e818de156',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/12 nodes are available: 12 Insufficient cpu, 12 Insufficient memory. preemption: 0/12 nodes are available: 12 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:20:04.166694Z',
    metadata: {
      name: 'test-workbench-0.181d102a1549a325',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/12 nodes are available: 12 Insufficient cpu, 12 Insufficient memory. preemption: 0/12 nodes are available: 12 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:25:04.808768Z',
    metadata: {
      name: 'test-workbench-0.181d107014f3a0ba',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/12 nodes are available: 1 node(s) were unschedulable, 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/12 nodes are available: 1 Preemption is not helpful for scheduling, 11 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:27:22.235684Z',
    metadata: {
      name: 'test-workbench-0.181d1090143bfe22',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/11 nodes are available: 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/11 nodes are available: 11 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:29:47.819130Z',
    metadata: {
      name: 'test-workbench-0.181d10b1f9af0bab',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'FailedScheduling',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message:
      '0/11 nodes are available: 11 Insufficient cpu, 11 Insufficient memory. preemption: 0/11 nodes are available: 11 No preemption victims found for incoming pod..',
    eventTime: '2025-01-22T16:29:58.329830Z',
    metadata: {
      name: 'test-workbench-0.181d10b46c2b9b03',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Warning',
    apiVersion: 'v1',
  },
  {
    reason: 'NotTriggerScaleUp',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message: "pod didn't trigger scale-up: 1 max node group size reached, 1 Insufficient memory",
    eventTime: '2025-01-22T16:29:47.819130Z',
    metadata: {
      name: 'test-workbench-0.181d0f8223a2a986',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T17:25:56Z',
    reason: 'NotTriggerScaleUp',
    involvedObject: {
      name: 'test-workbench-0',
    },
    message: "pod didn't trigger scale-up: 1 Insufficient memory, 1 max node group size reached",
    eventTime: '2025-01-22T16:29:47.819130Z',
    metadata: {
      name: 'test-workbench-0.181d0f7e7e3b6dde',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
];

const failedNotebookStatus: NotebookStatus = {
  currentEvent: 'Failed to scale-up',
  currentEventReason: 'NotTriggerScaleUp',
  currentEventDescription:
    "pod didn't trigger scale-up: 1 Insufficient memory, 1 max node group size reached",
  currentStatus: EventStatus.ERROR,
};

export const mockFailedStates = {
  notebookStatus: failedNotebookStatus,
  notebookState: failedNotebookState,
  events: failedNotebookEvents,
};

const inProgressNotebookStatus: NotebookStatus = {
  currentEvent: 'Pulling oauth proxy',
  currentEventReason: 'Pulling',
  currentEventDescription:
    'Pulling image "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4f8d66597feeb32bb18699326029f9a71a5aca4a57679d636b876377c2e95695"',
  currentStatus: EventStatus.SUCCESS,
};

const inProgressNotebookState: NotebookState = {
  notebook,
  isStarting: true,
  isRunning: false,
  isStopping: false,
  isStopped: false,
  runningPodUid: '59f51fb0-6c9d-4a3c-b906-4a6f1ac408e7',
  refresh: fauxRefresh,
};

const inProgressNotebookEvents: EventKind[] = [
  {
    reason: 'Scheduled',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Successfully assigned testing/new-pipeline-0 to ip-10-0-0-214.us-east-2.compute.internal',
    eventTime: '2025-01-22T20:18:52.988171Z',
    metadata: {
      name: 'new-pipeline-0.181d1d32459a2203',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:55Z',
    reason: 'SuccessfulAttachVolume',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'AttachVolume.Attach succeeded for volume "pvc-6647f3ae-30a0-4612-98fb-adeda5dec0e1" ',
    eventTime: '2025-01-22T20:18:55.988171Z',
    metadata: {
      name: 'new-pipeline-0.181d1d32d15f58c5',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'AddedInterface',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Add eth0 [10.130.6.239/23] from ovn-kubernetes',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d337605fb47',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'Pulling',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Pulling image "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2024.2"',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33790592f4',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'Pulled',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Successfully pulled image "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2024.2" in 153.317634ms (153.326806ms including waiting)',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33822948e2',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'Created',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Created container new-pipeline',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33861e2a1b',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'Started',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Started container new-pipeline',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d3386c210e4',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:58Z',
    reason: 'Pulling',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Pulling image "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4f8d66597feeb32bb18699326029f9a71a5aca4a57679d636b876377c2e95695"',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d3386caf5de',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
];

export const mockInProgressStates = {
  notebookStatus: inProgressNotebookStatus,
  notebookState: inProgressNotebookState,
  events: inProgressNotebookEvents,
};

const completedNotebookStatus: NotebookStatus = {
  currentEvent: 'Interface added',
  currentEventReason: 'AddedInterface',
  currentEventDescription: 'Add eth0 [10.130.6.239/23] from ovn-kubernetes',
  currentStatus: EventStatus.SUCCESS,
};

const completedNotebookState: NotebookState = {
  notebook,
  isStarting: false,
  isRunning: true,
  isStopping: false,
  isStopped: false,
  runningPodUid: '59f51fb0-6c9d-4a3c-b906-4a6f1ac408e7',
  refresh: fauxRefresh,
};

const completedNotebookEvents: EventKind[] = [
  {
    reason: 'Scheduled',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Successfully assigned testing/new-pipeline-0 to ip-10-0-0-214.us-east-2.compute.internal',
    eventTime: '2025-01-22T20:18:52.988171Z',
    metadata: {
      name: 'new-pipeline-0.181d1d32459a2203',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    lastTimestamp: '2025-01-22T20:18:55Z',
    reason: 'SuccessfulAttachVolume',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'AttachVolume.Attach succeeded for volume "pvc-6647f3ae-30a0-4612-98fb-adeda5dec0e1" ',
    eventTime: '2025-01-22T20:18:55Z',
    metadata: {
      name: 'new-pipeline-0.181d1d32d15f58c5',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Created',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Created container oauth-proxy',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33a9a163cd',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Pulled',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Successfully pulled image "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4f8d66597feeb32bb18699326029f9a71a5aca4a57679d636b876377c2e95695" in 364.698388ms (364.711132ms including waiting)',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d339c883533',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Pulling',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Pulling image "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4f8d66597feeb32bb18699326029f9a71a5aca4a57679d636b876377c2e95695"',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d3386caf5de',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Pulling',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Pulling image "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2024.2"',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33790592f4',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Pulled',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message:
      'Successfully pulled image "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2024.2" in 153.317634ms (153.326806ms including waiting)',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33822948e2',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Created',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Created container new-pipeline',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33861e2a1b',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Started',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Started container new-pipeline',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d3386c210e4',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'Started',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Started container oauth-proxy',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d33aa50e084',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
  {
    reason: 'AddedInterface',
    involvedObject: {
      name: 'new-pipeline-0',
    },
    message: 'Add eth0 [10.130.6.239/23] from ovn-kubernetes',
    eventTime: '2025-01-22T20:18:58Z',
    metadata: {
      name: 'new-pipeline-0.181d1d337605fb47',
      namespace: 'testing',
    },
    kind: 'Event',
    type: 'Normal',
    apiVersion: 'v1',
  },
];

export const mockCompletedStates = {
  notebookStatus: completedNotebookStatus,
  notebookState: completedNotebookState,
  events: completedNotebookEvents,
};
