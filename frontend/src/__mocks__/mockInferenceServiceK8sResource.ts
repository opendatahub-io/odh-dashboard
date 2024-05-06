import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceKind, KnownLabels } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';
import { ContainerResources } from '~/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  modelName?: string;
  secretName?: string;
  deleted?: boolean;
  isModelMesh?: boolean;
  activeModelState?: string;
  url?: string;
  path?: string;
  acceleratorIdentifier?: string;
  minReplicas?: number;
  maxReplicas?: number;
  lastFailureInfoMessage?: string;
  resources?: ContainerResources;
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
  activeModelState = 'Pending',
  url = '',
  acceleratorIdentifier = '',
  path = 'path/to/model',
  minReplicas = 1,
  maxReplicas = 1,
  lastFailureInfoMessage = 'Waiting for runtime Pod to become available',
  resources,
}: MockResourceConfigType): InferenceServiceKind => ({
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    annotations: {
      'openshift.io/display-name': displayName,
      ...(isModelMesh
        ? { 'serving.kserve.io/deploymentMode': 'ModelMesh' }
        : {
            'serving.knative.openshift.io/enablePassthrough': 'true',
            'sidecar.istio.io/inject': 'true',
            'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
          }),
    },
    creationTimestamp: '2023-03-17T16:12:41Z',
    ...(deleted ? { deletionTimestamp: new Date().toUTCString() } : {}),
    generation: 1,
    labels: {
      name,
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
    name,
    namespace,
    resourceVersion: '1309350',
    uid: genUID('service'),
  },
  spec: {
    predictor: {
      minReplicas,
      maxReplicas,
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
        storage: {
          key: secretName,
          path,
        },
      },
    },
  },
  status: {
    components: {},
    url,
    conditions: [
      {
        lastTransitionTime: '2023-03-17T16:12:41Z',
        status: 'False',
        type: 'PredictorReady',
      },
      {
        lastTransitionTime: '2023-03-17T16:12:41Z',
        status: 'False',
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
        reason: 'RuntimeUnhealthy',
        location: '',
        time: '',
      },
      states: {
        activeModelState,
        targetModelState: '',
      },
      transitionStatus: '',
    },
  },
});
