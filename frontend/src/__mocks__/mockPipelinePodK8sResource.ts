import { KnownLabels, PodKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { TolerationEffect, TolerationOperator } from '#~/types';

type MockResourceConfigType = {
  user?: string;
  name?: string;
  namespace?: string;
  isPending?: boolean;
};

export const mockPipelinePodK8sResource = ({
  user = 'test-user',
  name = 'test-pod',
  namespace = 'test-project',
  isPending = false,
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
        name: 'step-main',
        image: 'python:alpine3.6',
        env: [
          {
            name: 'SSL_CERT_DIR',
            value:
              '/tekton-custom-certs:/etc/ssl/certs:/etc/pki/tls/certs:/system/etc/security/cacerts',
          },
        ],
        resources: {},
        volumeMounts: [
          {
            name: 'tekton-internal-downward',
            mountPath: '/tekton/downward',
          },
          {
            name: 'tekton-creds-init-home-0',
            mountPath: '/tekton/creds',
          },
          {
            name: 'tekton-internal-run-0',
            mountPath: '/tekton/run/0',
          },
          {
            name: 'tekton-internal-run-1',
            mountPath: '/tekton/run/1',
          },
          {
            name: 'tekton-internal-run-2',
            mountPath: '/tekton/run/2',
          },
          {
            name: 'tekton-internal-bin',
            mountPath: '/tekton/bin',
          },
          {
            name: 'tekton-internal-workspace',
            mountPath: '/workspace',
          },
          {
            name: 'tekton-internal-home',
            mountPath: '/tekton/home',
          },
          {
            name: 'tekton-internal-results',
            mountPath: '/tekton/results',
          },
          {
            name: 'tekton-internal-steps',
            mountPath: '/tekton/steps',
          },
          {
            name: 'tekton-internal-secret-volume-pipeline-runner-pipelines-d-b5k8z',
            mountPath: '/tekton/creds-secrets/pipeline-runner-pipelines-definition-dockercfg-vmgzb',
          },
          {
            name: 'kube-api-access-92bpv',
            mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
          },
          {
            name: 'config-trusted-cabundle-volume',
            mountPath: '/tekton-custom-certs/ca-bundle.crt',
          },
          {
            name: 'config-service-cabundle-volume',
            mountPath: '/tekton-custom-certs/service-ca.crt',
          },
        ],
        imagePullPolicy: 'IfNotPresent',
        securityContext: {
          capabilities: {
            drop: ['ALL'],
          },
          runAsUser: 1000750000,
          runAsNonRoot: true,
          allowPrivilegeEscalation: false,
        },
      },
      {
        name: 'step-move-all-results-to-tekton-home',
        image:
          'registry.access.redhat.com/ubi8/ubi-micro@sha256:396baed3d689157d96aa7d8988fdfea7eb36684c8335eb391cf1952573e689c1',
        env: [
          {
            name: 'SSL_CERT_DIR',
            value:
              '/tekton-custom-certs:/etc/ssl/certs:/etc/pki/tls/certs:/system/etc/security/cacerts',
          },
        ],
        resources: {},
        volumeMounts: [
          {
            name: 'tekton-creds-init-home-1',
            mountPath: '/tekton/creds',
          },
          {
            name: 'tekton-internal-run-0',
            mountPath: '/tekton/run/0',
          },
          {
            name: 'tekton-internal-run-1',
            mountPath: '/tekton/run/1',
          },
          {
            name: 'tekton-internal-run-2',
            mountPath: '/tekton/run/2',
          },
          {
            name: 'tekton-internal-bin',
            mountPath: '/tekton/bin',
          },
          {
            name: 'tekton-internal-workspace',
            mountPath: '/workspace',
          },
          {
            name: 'tekton-internal-home',
            mountPath: '/tekton/home',
          },
          {
            name: 'tekton-internal-results',
            mountPath: '/tekton/results',
          },
          {
            name: 'tekton-internal-steps',
            mountPath: '/tekton/steps',
          },
          {
            name: 'tekton-internal-secret-volume-pipeline-runner-pipelines-d-b5k8z',
            mountPath: '/tekton/creds-secrets/pipeline-runner-pipelines-definition-dockercfg-vmgzb',
          },
          {
            name: 'kube-api-access-92bpv',
            mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
          },
          {
            name: 'config-trusted-cabundle-volume',
            mountPath: '/tekton-custom-certs/ca-bundle.crt',
          },
          {
            name: 'config-service-cabundle-volume',
            mountPath: '/tekton-custom-certs/service-ca.crt',
          },
        ],
        terminationMessagePath: '/tekton/termination',
        terminationMessagePolicy: 'File',
        imagePullPolicy: 'IfNotPresent',
        securityContext: {
          capabilities: {
            drop: ['ALL'],
          },
          runAsUser: 1000750000,
          runAsNonRoot: true,
          allowPrivilegeEscalation: false,
        },
      },
      {
        name: 'step-copy-artifacts',
        image:
          'quay.io/opendatahub/ds-pipelines-artifact-manager@sha256:db16085f67fd817088e7f6f592cf1b9c1558c56e0855303b3adea0b2fa18455f',
        env: [
          {
            name: 'ARTIFACT_BUCKET',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.annotations['tekton.dev/artifact_bucket']",
              },
            },
          },
          {
            name: 'ARTIFACT_ENDPOINT',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.annotations['tekton.dev/artifact_endpoint']",
              },
            },
          },
          {
            name: 'ARTIFACT_ENDPOINT_SCHEME',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.annotations['tekton.dev/artifact_endpoint_scheme']",
              },
            },
          },
          {
            name: 'ARTIFACT_ITEMS',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.annotations['tekton.dev/artifact_items']",
              },
            },
          },
          {
            name: 'PIPELINETASK',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.labels['tekton.dev/pipelineTask']",
              },
            },
          },
          {
            name: 'PIPELINERUN',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: "metadata.labels['tekton.dev/pipelineRun']",
              },
            },
          },
          {
            name: 'PODNAME',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: 'metadata.name',
              },
            },
          },
          {
            name: 'NAMESPACE',
            valueFrom: {
              fieldRef: {
                apiVersion: 'v1',
                fieldPath: 'metadata.namespace',
              },
            },
          },
          {
            name: 'AWS_ACCESS_KEY_ID',
            valueFrom: {
              secretKeyRef: {
                name: 'mlpipeline-minio-artifact',
                key: 'accesskey',
              },
            },
          },
          {
            name: 'AWS_SECRET_ACCESS_KEY',
            valueFrom: {
              secretKeyRef: {
                name: 'mlpipeline-minio-artifact',
                key: 'secretkey',
              },
            },
          },
          {
            name: 'ARCHIVE_LOGS',
            value: 'false',
          },
          {
            name: 'TRACK_ARTIFACTS',
            value: 'true',
          },
          {
            name: 'STRIP_EOF',
            value: 'true',
          },
          {
            name: 'SSL_CERT_DIR',
            value:
              '/tekton-custom-certs:/etc/ssl/certs:/etc/pki/tls/certs:/system/etc/security/cacerts',
          },
        ],
        resources: {},
        volumeMounts: [
          {
            name: 'tekton-creds-init-home-2',
            mountPath: '/tekton/creds',
          },
          {
            name: 'tekton-internal-run-0',
            mountPath: '/tekton/run/0',
          },
          {
            name: 'tekton-internal-run-1',
            mountPath: '/tekton/run/1',
          },
          {
            name: 'tekton-internal-run-2',
            mountPath: '/tekton/run/2',
          },
          {
            name: 'tekton-internal-bin',
            mountPath: '/tekton/bin',
          },
          {
            name: 'tekton-internal-workspace',
            mountPath: '/workspace',
          },
          {
            name: 'tekton-internal-home',
            mountPath: '/tekton/home',
          },
          {
            name: 'tekton-internal-results',
            mountPath: '/tekton/results',
          },
          {
            name: 'tekton-internal-steps',
            mountPath: '/tekton/steps',
          },
          {
            name: 'tekton-internal-secret-volume-pipeline-runner-pipelines-d-b5k8z',
            mountPath: '/tekton/creds-secrets/pipeline-runner-pipelines-definition-dockercfg-vmgzb',
          },
          {
            name: 'kube-api-access-92bpv',
            mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
          },
          {
            name: 'config-trusted-cabundle-volume',
            mountPath: '/tekton-custom-certs/ca-bundle.crt',
          },
          {
            name: 'config-service-cabundle-volume',
            mountPath: '/tekton-custom-certs/service-ca.crt',
          },
        ],
        terminationMessagePath: '/tekton/termination',
        terminationMessagePolicy: 'File',
        imagePullPolicy: 'IfNotPresent',
        securityContext: {
          capabilities: {
            drop: ['ALL'],
          },
          runAsUser: 1000750000,
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
    phase: 'Succeeded',
    conditions: [
      {
        type: 'Initialized',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2024-02-05T10:09:34Z',
        reason: 'PodCompleted',
      },
      {
        type: 'Ready',
        status: 'False',
        lastProbeTime: null,
        lastTransitionTime: '2024-02-05T10:09:36Z',
        reason: 'PodCompleted',
      },
      {
        type: 'ContainersReady',
        status: 'False',
        lastProbeTime: null,
        lastTransitionTime: '2024-02-05T10:09:36Z',
        reason: 'PodCompleted',
      },
      {
        type: 'PodScheduled',
        status: 'True',
        lastProbeTime: null,
        lastTransitionTime: '2024-02-05T10:09:31Z',
      },
    ],
    hostIP: '192.168.2.109',
    podIP: '10.130.2.167',
    podIPs: [
      {
        ip: '10.130.2.167',
      },
    ],
    startTime: '2024-02-05T10:09:31Z',
    initContainerStatuses: [
      {
        name: 'prepare',
        state: {
          terminated: {
            exitCode: 0,
            reason: 'Completed',
            startedAt: '2024-02-05T10:09:33Z',
            finishedAt: '2024-02-05T10:09:33Z',
            containerID: 'cri-o://47ab83e9fdfb5d695dfb172c698d45434ca7f782b001a15d9be4523f2aac5e52',
          },
        },
        lastState: {},
        ready: true,
        restartCount: 0,
        image:
          'registry.redhat.io/openshift-pipelines/pipelines-entrypoint-rhel8@sha256:ef8307e5a9bd928fed9f62effc6a90154ff31557645b0d5c512954b896b3c073',
        imageID:
          'registry.redhat.io/openshift-pipelines/pipelines-entrypoint-rhel8@sha256:eb344aaea3a273533b9a0548ae4cf0a5cf492d28f83aa9d83eb69d5aa418f3a5',
        containerID: 'cri-o://47ab83e9fdfb5d695dfb172c698d45434ca7f782b001a15d9be4523f2aac5e52',
      },
    ],
    containerStatuses: [
      {
        name: 'step-copy-artifacts',
        state: {
          terminated: !isPending,
          running: isPending,
        },
        ready: false,
      },
      {
        name: 'step-main',
        state: {
          terminated: !isPending,
          running: isPending,
        },
        ready: false,
      },
      {
        name: 'step-move-all-results-to-tekton-home',
        state: {
          terminated: !isPending,
          running: isPending,
        },
        ready: false,
      },
    ],
    qosClass: 'BestEffort',
  },
});
