import { KnownLabels, PodKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { TolerationEffect, TolerationOperator } from '#~/types';

type MockResourceConfigType = {
  user?: string;
  name?: string;
  namespace?: string;
  isPending?: boolean;
  isRunning?: boolean;
};

export const mockPodK8sResource = ({
  user = 'test-user',
  name = 'test-pod',
  namespace = 'test-project',
  isPending = false,
  isRunning = true,
}: MockResourceConfigType): PodKind => ({
  kind: 'Pod',
  apiVersion: 'project.openshift.io/v1',
  metadata: {
    name,
    generateName: name,
    namespace,
    uid: genUID('pod'),
    resourceVersion: '4800675',
    creationTimestamp: '2023-02-14T22:06:45Z',
    labels: {
      app: name,
      'controller-revision-hash': `${name}-5b68f78f58`,
      'notebook-name': name,
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
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
        name,
        uid: genUID('statefulset'),
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    managedFields: [],
  },
  spec: {
    volumes: [
      {
        name,
        persistentVolumeClaim: {
          claimName: name,
        },
      },
      {
        name: 'oauth-config',
        secret: {
          secretName: `${name}-oauth-config`,
        },
      },
      {
        name: 'tls-certificates',
        secret: {
          secretName: `${name}-tls`,
        },
      },
      {
        name: 'kube-api-access-zzc98',
      },
    ],
    containers: [
      {
        name,
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
            name,
            mountPath: '/opt/app-root/src',
          },
          {
            name: 'kube-api-access-zzc98',
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
        imagePullPolicy: 'Always',
      },
      {
        name: 'oauth-proxy',
        image:
          'registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46',
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
        imagePullPolicy: 'Always',
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
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
      {
        key: 'node.kubernetes.io/not-ready',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_EXECUTE,
        tolerationSeconds: 300,
      },
      {
        key: 'node.kubernetes.io/unreachable',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_EXECUTE,
        tolerationSeconds: 300,
      },
      {
        key: 'node.kubernetes.io/memory-pressure',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
    ],
    priority: 0,
    enableServiceLinks: false,
    preemptionPolicy: 'PreemptLowerPriority',
  },
  status: {
    phase: isPending ? 'Pending' : 'Running',
    conditions: !isPending
      ? [
          {
            type: 'Initialized',
            status: 'True',
            lastTransitionTime: '2023-02-14T22:06:45Z',
            lastProbeTime: null,
          },
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: '2023-02-14T22:07:05Z',
            lastProbeTime: null,
          },
          {
            type: 'ContainersReady',
            status: 'True',
            lastTransitionTime: '2023-02-14T22:07:05Z',
            lastProbeTime: null,
          },
          {
            type: 'PodScheduled',
            status: 'True',
            lastTransitionTime: '2023-02-14T22:06:45Z',
            lastProbeTime: null,
          },
        ]
      : [
          {
            type: 'PodScheduled',
            status: 'False',
            lastProbeTime: null,
            lastTransitionTime: '2023-11-30T21:24:21Z',
            reason: 'Unschedulable',
            message:
              ' 0/7 nodes are available: 2 Insufficient memory, 3 node(s) had untolerated taint {node-role.kubernetes.io/master: }, 4 Insufficient cpu, 4 Insufficient nvidia.com/gpu. preemption: 0/7 nodes are available:3 Preemption is not helpful for scheduling, 4 No preemption victims found for incoming pod..',
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
        name,
        state: {
          running: isRunning,
        },
        ready: isRunning,
      },
    ],
    qosClass: 'Burstable',
  },
});
