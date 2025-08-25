import { FeatureStoreKind } from '@odh-dashboard/internal/k8sTypes';

export const mockFeatureStore = ({
  name = 'demo',
  namespace = 'default',
}: {
  name?: string;
  namespace?: string;
}): FeatureStoreKind => ({
  apiVersion: 'feast.dev/v1alpha1',
  kind: 'FeatureStore',
  metadata: {
    creationTimestamp: '2025-07-02T12:43:05Z',
    generation: 1,
    name,
    namespace,
    resourceVersion: '19247356',
    uid: 'bf7d217f-4f10-4b67-b188-3d9478fc93ed',
    labels: {
      'feature-store-ui': 'enabled',
    },
  },
  spec: {
    feastProject: 'demo',
    services: {
      registry: {
        local: {
          server: {
            grpc: false,
            image: 'quay.io/feastdev-ci/feature-server:develop',
            restAPI: true,
          },
        },
      },
      ui: {},
    },
  },
  status: {
    applied: {
      cronJob: {
        concurrencyPolicy: 'Replace',
        containerConfigs: {
          commands: [
            'feast apply',
            "feast materialize-incremental $(date -u +'%Y-%m-%dT%H:%M:%S')",
          ],
          image: 'quay.io/openshift/origin-cli:4.17',
        },
        schedule: '@yearly',
        startingDeadlineSeconds: 5,
        suspend: true,
      },
      feastProject: 'demo',
      feastProjectDir: {
        init: {},
      },
      services: {
        onlineStore: {
          persistence: {
            file: {
              path: '/feast-data/online_store.db',
            },
          },
          server: {
            image: 'quay.io/nkathole/feast/feature-server:v11',
            tls: {
              secretKeyNames: {
                tlsCrt: 'tls.crt',
                tlsKey: 'tls.key',
              },
              secretRef: {
                name: 'feast-demo-online-tls',
              },
            },
          },
        },
        registry: {
          local: {
            persistence: {
              file: {
                path: '/feast-data/registry.db',
              },
            },
            server: {
              grpc: false,
              image: 'quay.io/feastdev-ci/feature-server:develop',
              restAPI: true,
              tls: {
                secretKeyNames: {
                  tlsCrt: 'tls.crt',
                  tlsKey: 'tls.key',
                },
                secretRef: {
                  name: 'feast-demo-registry-rest-tls',
                },
              },
            },
          },
        },
        ui: {
          image: 'quay.io/nkathole/feast/feature-server:v11',
          tls: {
            secretKeyNames: {
              tlsCrt: 'tls.crt',
              tlsKey: 'tls.key',
            },
            secretRef: {
              name: 'feast-demo-ui-tls',
            },
          },
        },
      },
    },
    clientConfigMap: 'feast-demo-client',
    conditions: [
      {
        lastTransitionTime: '2025-07-02T12:43:23Z',
        message: 'Online Store installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'OnlineStore',
      },
      {
        lastTransitionTime: '2025-07-02T12:43:22Z',
        message: 'Registry installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'Registry',
      },
      {
        lastTransitionTime: '2025-07-02T12:43:22Z',
        message: 'UI installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'UI',
      },
      {
        lastTransitionTime: '2025-07-02T12:43:22Z',
        message: 'Client installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'Client',
      },
      {
        lastTransitionTime: '2025-07-02T12:43:22Z',
        message: 'CronJob installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'CronJob',
      },
      {
        lastTransitionTime: '2025-07-02T12:43:32Z',
        message: 'FeatureStore installation complete',
        reason: 'Ready',
        status: 'True',
        type: 'FeatureStore',
      },
    ],
    cronJob: 'feast-demo',
    feastVersion: '0.49.0',
    phase: 'Ready',
    serviceHostnames: {
      onlineStore: 'feast-demo-online.default.svc.cluster.local:443',
      registry: 'feast-demo-registry.default.svc.cluster.local:443',
      registryRest: 'feast-demo-registry-rest.default.svc.cluster.local:443',
      ui: 'feast-demo-ui.default.svc.cluster.local:443',
    },
  },
});
