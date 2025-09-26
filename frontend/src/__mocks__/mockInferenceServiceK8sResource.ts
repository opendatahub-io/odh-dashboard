import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { DeploymentMode, InferenceServiceKind, KnownLabels } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { ContainerResources, NodeSelector, ServingRuntimeModelType, Toleration } from '#~/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  modelName?: string;
  secretName?: string;
  deleted?: boolean;
  isModelMesh?: boolean;
  missingStatus?: boolean;
  activeModelState?: string;
  targetModelState?: string;
  url?: string;
  path?: string;
  acceleratorIdentifier?: string;
  minReplicas?: number;
  maxReplicas?: number;
  imagePullSecrets?: Array<{ name: string }>;
  lastFailureInfoMessage?: string;
  lastFailureInfoReason?: string;
  resources?: ContainerResources;
  kserveInternalUrl?: string;
  statusPredictor?: Record<string, string>;
  kserveInternalLabel?: boolean;
  additionalLabels?: Record<string, string>;
  args?: string[];
  env?: Array<{
    name: string;
    value?: string;
    valueFrom?: { secretKeyRef: { name: string; key: string } };
  }>;
  isKserveRaw?: boolean;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  isNonDashboardItem?: boolean;
  hardwareProfileName?: string;
  hardwareProfileNamespace?: string;
  creationTimestamp?: string;
  lastTransitionTime?: string;
  isReady?: boolean;
  predictorAnnotations?: Record<string, string>;
  storageUri?: string;
  modelType?: ServingRuntimeModelType;
};

type InferenceServicek8sError = K8sStatus & {
  metadata: Record<string, unknown>;
  details: {
    name: string;
    group: string;
    kind: string;
    causes: {
      reason: string;
      message: string;
      field: string;
    }[];
  };
};

export const mockInferenceServicek8sError = (): InferenceServicek8sError => ({
  kind: 'Status',
  apiVersion: 'v1',
  metadata: {},
  code: 400,
  status: 'Failure',
  message:
    'InferenceService.serving.kserve.io "trigger-error" is invalid: [metadata.name: Invalid value: "trigger-error": is invalid, metadata.labels: Invalid value: "trigger-error": must have proper format]',
  reason: 'Invalid',
  details: {
    name: 'trigger-error',
    group: 'serving.kserve.io',
    kind: 'InferenceService',
    causes: [
      {
        reason: 'FieldValueInvalid',
        message: 'Invalid value: "trigger-error": must have proper format',
        field: 'metadata.name',
      },
    ],
  },
});

export const mockInferenceServiceK8sResource = ({
  name = 'test-inference-service',
  namespace = 'test-project',
  displayName = 'Test Inference Service',
  modelName = 'test-model',
  secretName = 'test-secret',
  deleted = false,
  isModelMesh = false,
  missingStatus = false,
  activeModelState = 'Loaded',
  targetModelState = 'Loaded',
  url = '',
  acceleratorIdentifier = '',
  path = 'path/to/model',
  minReplicas = 1,
  maxReplicas = 1,
  imagePullSecrets = undefined,
  lastFailureInfoMessage = 'Waiting for runtime Pod to become available',
  lastFailureInfoReason,
  resources,
  statusPredictor = undefined,
  kserveInternalUrl = '',
  additionalLabels = {},
  args = [],
  env = [],
  tolerations,
  nodeSelector,
  isNonDashboardItem = false,
  hardwareProfileName = '',
  hardwareProfileNamespace = undefined,
  creationTimestamp = '2023-03-17T16:12:41Z',
  lastTransitionTime = '2023-03-17T16:12:41Z',
  isReady = false,
  predictorAnnotations = undefined,
  storageUri = undefined,
  modelType,
}: MockResourceConfigType): InferenceServiceKind => ({
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    annotations: {
      'openshift.io/display-name': displayName,
      'serving.kserve.io/deploymentMode': isModelMesh
        ? DeploymentMode.ModelMesh
        : DeploymentMode.RawDeployment,
      ...(hardwareProfileName && {
        [`opendatahub.io/hardware-profile-name`]: hardwareProfileName,
      }),
      ...(hardwareProfileNamespace && {
        'opendatahub.io/hardware-profile-namespace': hardwareProfileNamespace,
      }),
      ...(modelType && { 'opendatahub.io/model-type': modelType }),
    },
    creationTimestamp,
    ...(deleted ? { deletionTimestamp: new Date().toUTCString() } : {}),
    generation: 1,
    labels: {
      name,
      ...additionalLabels,
      ...(isNonDashboardItem ? {} : { [KnownLabels.DASHBOARD_RESOURCE]: 'true' }),
    },
    name,
    namespace,
    resourceVersion: '1309350',
    uid: genUID('service'),
  },
  spec: {
    predictor: {
      ...(predictorAnnotations && { annotations: predictorAnnotations }),
      minReplicas,
      maxReplicas,
      imagePullSecrets,
      ...(tolerations && { tolerations }),
      ...(nodeSelector && { nodeSelector }),
      model: {
        modelFormat: {
          name: 'onnx',
          version: '1',
        },
        ...(acceleratorIdentifier !== ''
          ? {
              resources: {
                limits: {
                  acceleratorIdentifier: '2',
                },
                requests: {
                  acceleratorIdentifier: '2',
                },
              },
            }
          : {}),
        ...(resources && { resources }),
        runtime: modelName,
        ...(storageUri
          ? { storageUri }
          : {
              storage: {
                key: secretName,
                path,
              },
            }),
        args,
        env,
      },
    },
  },
  status: missingStatus
    ? undefined
    : {
        components: {
          ...(statusPredictor && { predictor: statusPredictor }),
        },
        url,
        conditions: [
          {
            lastTransitionTime,
            status: 'False',
            type: 'PredictorReady',
          },
          {
            lastTransitionTime,
            status: isReady ? 'True' : 'False',
            type: 'Ready',
          },
        ],
        modelStatus: {
          copies: {
            failedCopies: 0,
            totalCopies: 0,
          },
          lastFailureInfo: {
            message: lastFailureInfoMessage,
            modelRevisionName: 'model-size__isvc-59ce37c85b',
            reason: lastFailureInfoReason,
            location: '',
            time: '',
          },
          states: {
            activeModelState,
            targetModelState,
          },
          transitionStatus: '',
        },
        ...(kserveInternalUrl && {
          address: {
            url: kserveInternalUrl,
          },
        }),
      },
});
