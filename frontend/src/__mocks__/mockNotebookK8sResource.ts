import * as _ from 'lodash-es';
import { KnownLabels, NotebookKind } from '#~/k8sTypes';
import { DEFAULT_NOTEBOOK_SIZES } from '#~/pages/projects/screens/spawner/const';
import {
  ContainerResources,
  EnvironmentVariable,
  TolerationEffect,
  TolerationOperator,
  Volume,
  VolumeMount,
} from '#~/types';
import { genUID } from '#~/__mocks__/mockUtils';
import { RecursivePartial } from '#~/typeHelpers';
import { EnvironmentFromVariable } from '#~/pages/projects/types';

type MockResourceConfigType = {
  name?: string;
  displayName?: string;
  namespace?: string;
  user?: string;
  description?: string;
  envFrom?: EnvironmentFromVariable[];
  additionalEnvs?: EnvironmentVariable[];
  resources?: ContainerResources;
  image?: string;
  imageDisplayName?: string;
  lastImageSelection?: string;
  opts?: RecursivePartial<NotebookKind>;
  uid?: string;
  additionalVolumeMounts?: VolumeMount[];
  additionalVolumes?: Volume[];
  hardwareProfileName?: string;
  hardwareProfileNamespace?: string | null;
  workbenchImageNamespace?: string | null;
};

export const mockNotebookK8sResource = ({
  name = 'test-notebook',
  displayName = 'Test Notebook',
  envFrom = [
    {
      secretRef: {
        name: 'secret',
      },
    },
  ],
  additionalEnvs = [],
  namespace = 'test-project',
  user = 'test-user',
  description = '',
  resources = DEFAULT_NOTEBOOK_SIZES[0].resources,
  image = 'test-imagestream:1.2',
  imageDisplayName = 'test-image',
  lastImageSelection = 's2i-minimal-notebook:py3.8-v1',
  opts = {},
  uid = genUID('notebook'),
  additionalVolumeMounts = [],
  additionalVolumes = [],
  hardwareProfileName = '',
  hardwareProfileNamespace = null,
  workbenchImageNamespace = null,
}: MockResourceConfigType): NotebookKind =>
  _.merge(
    {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: {
        annotations: {
          'opendatahub.io/image-display-name': imageDisplayName,
          'notebooks.kubeflow.org/last-activity': '2023-02-14T21:45:14Z',
          'notebooks.opendatahub.io/inject-oauth': 'true',
          'notebooks.opendatahub.io/last-image-selection': lastImageSelection,
          'notebooks.opendatahub.io/last-size-selection': 'Small',
          'notebooks.opendatahub.io/oauth-logout-url':
            'http://localhost:4010/projects/project?notebookLogout=workbench',
          'opendatahub.io/username': user,
          'openshift.io/description': description,
          'openshift.io/display-name': displayName,
          'opendatahub.io/hardware-profile-name': hardwareProfileName,
          'opendatahub.io/hardware-profile-namespace': hardwareProfileNamespace,
          'opendatahub.io/workbench-image-namespace': workbenchImageNamespace,
        },
        creationTimestamp: '2023-02-14T21:44:13Z',
        generation: 4,
        labels: {
          app: name,
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          'opendatahub.io/odh-managed': 'true',
          'opendatahub.io/user': user,
        },
        managedFields: [],
        name,
        namespace,
        resourceVersion: '4800689',
        uid,
      },
      spec: {
        template: {
          spec: {
            affinity: {
              nodeAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [
                  {
                    preference: {
                      matchExpressions: [
                        {
                          key: 'nvidia.com/gpu.present',
                          operator: 'NotIn',
                          values: ['true'],
                        },
                      ],
                    },
                    weight: 1,
                  },
                ],
              },
            },
            containers: [
              {
                env: [
                  {
                    name: 'NOTEBOOK_ARGS',
                    value:
                      '--ServerApp.port=8888\n                  --ServerApp.token=\'\'\n                  --ServerApp.password=\'\'\n                  --ServerApp.base_url=/notebook/project/workbench\n                  --ServerApp.quit_button=False\n                  --ServerApp.tornado_settings={"user":"user","hub_host":"http://localhost:4010","hub_prefix":"/projects/project"}',
                  },
                  {
                    name: 'JUPYTER_IMAGE',
                    value:
                      'image-registry.openshift-image-registry.svc:5000/opendatahub/code-server-notebook:2023.2',
                  },
                  ...additionalEnvs,
                ],
                envFrom,
                image,
                imagePullPolicy: 'Always',
                livenessProbe: {
                  failureThreshold: 3,
                  httpGet: {
                    path: '/notebook/project/workbench/api',
                    port: 'notebook-port',
                    scheme: 'HTTP',
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                  successThreshold: 1,
                  timeoutSeconds: 1,
                },
                name,
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
                    path: '/notebook/project/workbench/api',
                    port: 'notebook-port',
                    scheme: 'HTTP',
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                  successThreshold: 1,
                  timeoutSeconds: 1,
                },
                resources,
                volumeMounts: [
                  {
                    mountPath: '/opt/app-root/src',
                    name,
                  },
                  {
                    mountPath: '/opt/app-root/src/root',
                    name: 'test-storage-1',
                  },
                  ...additionalVolumeMounts,
                ],
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
                  'registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46',
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
            tolerations: [
              {
                effect: TolerationEffect.NO_SCHEDULE,
                key: 'NotebooksOnlyChange',
                operator: TolerationOperator.EXISTS,
              },
            ],
            volumes: [
              {
                name,
                persistentVolumeClaim: {
                  claimName: name,
                },
              },
              {
                name: 'test-storage-1',
                persistentVolumeClaim: {
                  claimName: 'test-storage-1',
                },
              },
              {
                name: 'oauth-config',
                secret: {
                  secretName: 'workbench-oauth-config',
                },
              },
              {
                name: 'tls-certificates',
                secret: {
                  secretName: 'workbench-tls',
                },
              },
              ...additionalVolumes,
            ],
          },
        },
      },
      status: {
        conditions: [
          {
            lastProbeTime: '2023-02-14T22:06:54Z',
            type: 'Running',
          },
          {
            lastProbeTime: '2023-02-14T22:06:44Z',
            message: 'Completed',
            reason: 'Completed',
            type: 'Terminated',
          },
          {
            lastProbeTime: '2023-02-14T22:05:53Z',
            type: 'Running',
          },
          {
            lastProbeTime: '2023-02-14T22:05:48Z',
            reason: 'ContainerCreating',
            type: 'Waiting',
          },
          {
            lastProbeTime: '2023-02-14T21:44:27Z',
            type: 'Running',
          },
          {
            lastProbeTime: '2023-02-14T21:44:24Z',
            reason: 'ContainerCreating',
            type: 'Waiting',
          },
        ],
        containerState: {},
        readyReplicas: 1,
      },
    } as NotebookKind,
    opts,
  );
