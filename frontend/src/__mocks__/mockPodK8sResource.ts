import { PodKind } from '~/k8sTypes';

type MockResourceConfigType = {
  user?: string;
  name?: string;
  namespace?: string;
};

export const mockPodK8sResource = ({
  user = 'test-user',
  name = 'test-pod',
  namespace = 'test-project',
}: MockResourceConfigType): PodKind => ({
  kind: 'Pod',
  apiVersion: 'project.openshift.io/v1',
  metadata: {
    name: name,
    generateName: name,
    namespace: namespace,
    uid: '6de9706e-5065-41b2-84a6-7a568404b0d1',
    resourceVersion: '4800675',
    creationTimestamp: '2023-02-14T22:06:45Z',
    labels: {
      app: name,
      'controller-revision-hash': `${name}-5b68f78f58`,
      'notebook-name': name,
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/odh-managed': 'true',
      'opendatahub.io/user': user,
      statefulset: name,
      'statefulset.kubernetes.io/pod-name': name,
    },
    annotations: {
      'openshift.io/scc': 'restricted-v2',
      'seccomp.security.alpha.kubernetes.io/pod': 'runtime/default',
    },
    ownerReferences: [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        name: name,
        uid: '5c0e1547-5906-46cb-8562-8d10545dc98c',
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    managedFields: [],
  },
  spec: {
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
          secretName: `${name}-oauth-config`,
          defaultMode: 420,
        },
      },
      {
        name: 'tls-certificates',
        secret: {
          secretName: `${name}-tls`,
          defaultMode: 420,
        },
      },
      {
        name: 'kube-api-access-zzc98',
        projected: {
          sources: [
            {
              serviceAccountToken: {
                expirationSeconds: 3607,
                path: 'token',
              },
            },
            {
              configMap: {
                name: 'kube-root-ca.crt',
                items: [
                  {
                    key: 'ca.crt',
                    path: 'ca.crt',
                  },
                ],
              },
            },
            {
              downwardAPI: {
                items: [
                  {
                    path: 'namespace',
                    fieldRef: {
                      apiVersion: 'v1',
                      fieldPath: 'metadata.namespace',
                    },
                  },
                ],
              },
            },
            {
              configMap: {
                name: 'openshift-service-ca.crt',
                items: [
                  {
                    key: 'service-ca.crt',
                    path: 'service-ca.crt',
                  },
                ],
              },
            },
          ],
          defaultMode: 420,
        },
      },
    ],
    containers: [
      {
        name: name,
        image:
          'image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1',
        workingDir: '/opt/app-root/src',
        ports: [
          {
            name: 'notebook-port',
            containerPort: 8888,
            protocol: 'TCP',
          },
        ],
        envFrom: [
          {
            secretRef: {
              name: 'aws-connection-db-1',
            },
          },
        ],
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
          {
            name: 'NB_PREFIX',
            value: '/notebook/project/workbench',
          },
        ],
        resources: {
          limits: {
            cpu: '2',
            memory: '8Gi',
          },
          requests: {
            cpu: '1',
            memory: '8Gi',
          },
        },
        volumeMounts: [
          {
            name: name,
            mountPath: '/opt/app-root/src',
          },
          {
            name: 'kube-api-access-zzc98',
            readOnly: true,
            mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
          },
        ],
        livenessProbe: {
          httpGet: {
            path: '/notebook/project/workbench/api',
            port: 'notebook-port',
            scheme: 'HTTP',
          },
          initialDelaySeconds: 10,
          timeoutSeconds: 1,
          periodSeconds: 5,
          successThreshold: 1,
          failureThreshold: 3,
        },
        readinessProbe: {
          httpGet: {
            path: '/notebook/project/workbench/api',
            port: 'notebook-port',
            scheme: 'HTTP',
          },
          initialDelaySeconds: 10,
          timeoutSeconds: 1,
          periodSeconds: 5,
          successThreshold: 1,
          failureThreshold: 3,
        },
        terminationMessagePath: '/dev/termination-log',
        terminationMessagePolicy: 'File',
        imagePullPolicy: 'Always',
        securityContext: {
          capabilities: {
            drop: ['ALL'],
          },
          runAsUser: 1000700000,
          runAsNonRoot: true,
          allowPrivilegeEscalation: false,
        },
      },
      {
        name: 'oauth-proxy',
        image:
          'registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46',
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
        ports: [
          {
            name: 'oauth-proxy',
            containerPort: 8443,
            protocol: 'TCP',
          },
        ],
        env: [
          {
            name: 'NAMESPACE',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: 'metadata.namespace',
              },
            },
          },
        ],
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
            name: 'oauth-config',
            mountPath: '/etc/oauth/config',
          },
          {
            name: 'tls-certificates',
            mountPath: '/etc/tls/private',
          },
          {
            name: 'kube-api-access-zzc98',
            readOnly: true,
            mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
          },
        ],
        livenessProbe: {
          httpGet: {
            path: '/oauth/healthz',
            port: 'oauth-proxy',
            scheme: 'HTTPS',
          },
          initialDelaySeconds: 30,
          timeoutSeconds: 1,
          periodSeconds: 5,
          successThreshold: 1,
          failureThreshold: 3,
        },
        readinessProbe: {
          httpGet: {
            path: '/oauth/healthz',
            port: 'oauth-proxy',
            scheme: 'HTTPS',
          },
          initialDelaySeconds: 5,
          timeoutSeconds: 1,
          periodSeconds: 5,
          successThreshold: 1,
          failureThreshold: 3,
        },
        terminationMessagePath: '/dev/termination-log',
        terminationMessagePolicy: 'File',
        imagePullPolicy: 'Always',
        securityContext: {
          capabilities: {
            drop: ['ALL'],
          },
          runAsUser: 1000700000,
          runAsNonRoot: true,
          allowPrivilegeEscalation: false,
        },
      },
    ],
    restartPolicy: 'Always',
    terminationGracePeriodSeconds: 30,
    dnsPolicy: 'ClusterFirst',
    serviceAccountName: name,
    serviceAccount: name,
    nodeName: 'user-xz6d2-worker-0-hw2hq',
    securityContext: {
      seLinuxOptions: {
        level: 's0:c26,c25',
      },
      fsGroup: 1000700000,
      seccompProfile: {
        type: 'RuntimeDefault',
      },
    },
    imagePullSecrets: [
      {
        name: 'workbench-dockercfg-dn9g4',
      },
    ],
    hostname: 'workbench-0',
    affinity: {
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: [
          {
            weight: 1,
            preference: {
              matchExpressions: [
                {
                  key: 'nvidia.com/gpu.present',
                  operator: 'NotIn',
                  values: ['true'],
                },
              ],
            },
          },
        ],
      },
    },
    schedulerName: 'default-scheduler',
    tolerations: [
      {
        key: 'NotebooksOnlyChange',
        operator: 'Exists',
        effect: 'NoSchedule',
      },
      {
        key: 'node.kubernetes.io/not-ready',
        operator: 'Exists',
        effect: 'NoExecute',
        tolerationSeconds: 300,
      },
      {
        key: 'node.kubernetes.io/unreachable',
        operator: 'Exists',
        effect: 'NoExecute',
        tolerationSeconds: 300,
      },
      {
        key: 'node.kubernetes.io/memory-pressure',
        operator: 'Exists',
        effect: 'NoSchedule',
      },
    ],
    priority: 0,
    enableServiceLinks: false,
    preemptionPolicy: 'PreemptLowerPriority',
  },
  status: {
    phase: 'Running',
    conditions: [
      {
        type: 'Initialized',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2023-02-14T22:06:45Z',
      },
      {
        type: 'Ready',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2023-02-14T22:07:05Z',
      },
      {
        type: 'ContainersReady',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2023-02-14T22:07:05Z',
      },
      {
        type: 'PodScheduled',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2023-02-14T22:06:45Z',
      },
    ],
    hostIP: '192.168.0.217',
    podIP: '10.131.1.182',
    podIPs: [
      {
        ip: '10.131.1.182',
      },
    ],
    startTime: '2023-02-14T22:06:45Z',
    containerStatuses: [
      {
        state: {
          running: true,
        },
        ready: true,
      },
    ],
    qosClass: 'Burstable',
  },
});
