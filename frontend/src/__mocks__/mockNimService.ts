import { NIMServiceKind, KnownLabels } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { ContainerResources, NodeSelector, Toleration } from '#~/types';

type MockNIMServiceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  imageRepository?: string;
  imageTag?: string;
  imagePullSecrets?: string[];
  authSecretName?: string;
  pvcName?: string;
  pvcSubPath?: string;
  replicas?: number;
  resources?: ContainerResources;
  servicePort?: number;
  tokenAuth?: boolean;
  externalRoute?: boolean;
  envVars?: { name: string; value: string }[];
  nodeSelector?: NodeSelector;
  tolerations?: Toleration[];
  state?: 'Pending' | 'NotReady' | 'Ready' | 'Failed';
  availableReplicas?: number;
  clusterEndpoint?: string;
  externalEndpoint?: string;
  creationTimestamp?: string;
  isNonDashboardItem?: boolean;
};

/**
 * Mock NIMService resource for testing.
 * NIMService is the NVIDIA NIM Operator's custom resource for deploying NIM models.
 * When created, the NIM Operator automatically creates an InferenceService.
 */
export const mockNimService = ({
  name = 'test-nim-service',
  namespace = 'test-project',
  displayName = 'Test NIM Service',
  imageRepository = 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
  imageTag = '1.12.0',
  imagePullSecrets = ['ngc-secret'],
  authSecretName = 'nvidia-nim-secrets',
  pvcName = 'nim-pvc-123',
  pvcSubPath,
  replicas = 1,
  resources,
  servicePort = 8000,
  tokenAuth = false,
  externalRoute = false,
  envVars = [],
  nodeSelector,
  tolerations,
  state = 'Ready',
  availableReplicas = 1,
  clusterEndpoint = 'http://test-nim-service.test-project.svc.cluster.local',
  externalEndpoint,
  creationTimestamp = '2023-03-17T16:12:41Z',
  isNonDashboardItem = false,
}: MockNIMServiceConfigType = {}): NIMServiceKind => ({
  apiVersion: 'apps.nvidia.com/v1alpha1',
  kind: 'NIMService',
  metadata: {
    name,
    namespace,
    annotations: {
      'openshift.io/display-name': displayName,
      'serving.kserve.io/deploymentMode': 'Standard',
    },
    labels: {
      ...(isNonDashboardItem ? {} : { [KnownLabels.DASHBOARD_RESOURCE]: 'true' }),
      ...(externalRoute && { 'networking.kserve.io/visibility': 'exposed' }),
    },
    creationTimestamp,
    uid: genUID('nimservice'),
    resourceVersion: '12345',
  },
  spec: {
    inferencePlatform: 'kserve',
    image: {
      repository: imageRepository,
      tag: imageTag,
      pullPolicy: 'IfNotPresent',
      pullSecrets: imagePullSecrets,
    },
    authSecret: authSecretName,
    storage: {
      pvc: {
        name: pvcName,
        ...(pvcSubPath && { subPath: pvcSubPath }),
      },
    },
    replicas,
    ...(resources && { resources }),
    expose: {
      service: {
        type: 'ClusterIP',
        port: servicePort,
      },
    },
    ...(envVars.length > 0 && {
      env: envVars.map((ev) => ({ name: ev.name, value: ev.value })),
    }),
    ...(nodeSelector && { nodeSelector }),
    ...(tolerations && { tolerations }),
    ...(tokenAuth && {
      annotations: {
        'security.opendatahub.io/enable-auth': 'true',
      },
    }),
  },
  status: {
    state,
    availableReplicas,
    conditions: [
      {
        type: 'Ready',
        status: state === 'Ready' ? 'True' : 'False',
        lastTransitionTime: creationTimestamp,
        reason: state,
        message: state === 'Ready' ? 'NIMService is ready' : `NIMService is ${state.toLowerCase()}`,
      },
    ],
    model: {
      name: imageRepository.split('/').pop() || 'unknown',
      clusterEndpoint,
      externalEndpoint: externalEndpoint || '',
    },
  },
});

/**
 * Mock NIMService in pending state
 */
export const mockPendingNimService = (
  overrides: Partial<MockNIMServiceConfigType> = {},
): NIMServiceKind =>
  mockNimService({
    state: 'Pending',
    availableReplicas: 0,
    ...overrides,
  });

/**
 * Mock NIMService in failed state
 */
export const mockFailedNimService = (
  overrides: Partial<MockNIMServiceConfigType> = {},
): NIMServiceKind =>
  mockNimService({
    state: 'Failed',
    availableReplicas: 0,
    ...overrides,
  });
