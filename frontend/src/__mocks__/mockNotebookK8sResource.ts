import { KnownLabels, NotebookKind } from '~/k8sTypes';
import { DEFAULT_NOTEBOOK_SIZES } from '~/pages/projects/screens/spawner/const';
import { ContainerResources } from '~/types';
import { genUID } from '~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
  displayName?: string;
  namespace?: string;
  user?: string;
  description?: string;
  resources?: ContainerResources;
};

export const mockNotebookK8sResource = ({
  name = 'test-notebook',
  displayName = 'Test Notebook',
  namespace = 'test-project',
  user = 'test-user',
  description = '',
  resources = DEFAULT_NOTEBOOK_SIZES[0].resources,
}: MockResourceConfigType): NotebookKind => ({
  apiVersion: 'kubeflow.org/v1',
  kind: 'Notebook',
  metadata: {
    annotations: {
      'notebooks.kubeflow.org/last-activity': '2023-02-14T21:45:14Z',
      'notebooks.opendatahub.io/inject-oauth': 'true',
      'notebooks.opendatahub.io/last-image-selection': 's2i-minimal-notebook:py3.8-v1',
      'notebooks.opendatahub.io/last-size-selection': 'Small',
      'notebooks.opendatahub.io/oauth-logout-url':
        'http://localhost:4010/projects/project?notebookLogout=workbench',
      'opendatahub.io/username': user,
      'openshift.io/description': description,
      'openshift.io/display-name': displayName,
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
    name: name,
    namespace: namespace,
    resourceVersion: '4800689',
    uid: genUID('notebook'),
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
                  'image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1',
              },
            ],
            envFrom: [
              {
                secretRef: {
                  name: 'aws-connection-db-1',
                },
              },
            ],
            image:
              'image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1',
            imagePullPolicy: 'IfNotPresent',
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
            name: name,
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
                name: name,
              },
            ],
            workingDir: '/opt/app-root/src',
          },
          {
            args: [
              '--provider=openshift',
              '--https-address=:8443',
              '--http-address=',
              '--openshift-service-account=workbench',
              '--cookie-secret-file=/etc/oauth/config/cookie_secret',
              '--cookie-expire=24h0m0s',
              '--tls-cert=/etc/tls/private/tls.crt',
              '--tls-key=/etc/tls/private/tls.key',
              '--upstream=http://localhost:8888',
              '--upstream-ca=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
              '--skip-auth-regex=^(?:/notebook/$(NAMESPACE)/workbench)?/api$',
              '--email-domain=*',
              '--skip-provider-button',
              '--openshift-sar={"verb":"get","resource":"notebooks","resourceAPIGroup":"kubeflow.org","resourceName":"workbench","namespace":"$(NAMESPACE)"}',
              '--logout-url=http://localhost:4010/projects/project?notebookLogout=workbench',
            ],
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
            imagePullPolicy: 'IfNotPresent',
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
        serviceAccountName: name,
        tolerations: [
          {
            effect: 'NoSchedule',
            key: 'NotebooksOnlyChange',
            operator: 'Exists',
          },
        ],
        volumes: [
          {
            name: name,
            persistentVolumeClaim: {
              claimName: name,
            },
          },
          {
            name: 'oauth-config',
            secret: {
              defaultMode: 420,
              secretName: 'workbench-oauth-config',
            },
          },
          {
            name: 'tls-certificates',
            secret: {
              defaultMode: 420,
              secretName: 'workbench-tls',
            },
          },
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
    containerState: {
      running: {
        startedAt: '2023-02-14T22:06:52Z',
      },
    },
    readyReplicas: 1,
  },
});
