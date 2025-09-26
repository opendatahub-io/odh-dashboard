import { genUID } from '@odh-dashboard/internal/__mocks__/mockUtils';
import type { LLMInferenceServiceKind } from '../types';

type MockLLMInferenceServiceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  modelName?: string;
  modelUri?: string;
  deleted?: boolean;
  replicas?: number;
  creationTimestamp?: string;
  lastTransitionTime?: string;
  isReady?: boolean;
  url?: string;
  additionalLabels?: Record<string, string>;
  isNonDashboardItem?: boolean;
};

export const mockLLMInferenceServiceK8sResource = ({
  name = 'test-llm-inference-service',
  namespace = 'test-project',
  displayName = 'Test LLM Inference Service',
  modelName = 'facebook/opt-125m',
  modelUri = 'hf://facebook/opt-125m',
  deleted = false,
  replicas = 1,
  creationTimestamp = '2023-03-17T16:12:41Z',
  lastTransitionTime = '2023-03-17T16:12:41Z',
  isReady = true,
  url,
}: MockLLMInferenceServiceConfigType): LLMInferenceServiceKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'LLMInferenceService',
  metadata: {
    annotations: {
      'openshift.io/display-name': displayName,
    },
    creationTimestamp,
    ...(deleted ? { deletionTimestamp: new Date().toUTCString() } : {}),
    generation: 1,
    labels: {
      name,
    },
    name,
    namespace,
    resourceVersion: '5188930',
    uid: genUID('llm-service'),
  },
  spec: {
    model: {
      name: modelName,
      uri: modelUri,
    },
    replicas,
    router: {
      gateway: {},
      route: {},
      scheduler: {},
    },
    template: {
      containers: [
        {
          env: [
            {
              name: 'VLLM_LOGGING_LEVEL',
              value: 'DEBUG',
            },
          ],
          image: 'quay.io/pierdipi/vllm-cpu:latest',
          livenessProbe: {
            failureThreshold: 5,
            initialDelaySeconds: 30,
            periodSeconds: 30,
            timeoutSeconds: 30,
          },
          name: 'main',
          resources: {
            limits: {
              cpu: '2',
              memory: '8Gi',
            },
            requests: {
              cpu: '1',
              memory: '4Gi',
            },
          },
        },
      ],
    },
  },
  status: {
    conditions: [
      {
        lastTransitionTime,
        message: isReady ? '' : 'The following HTTPRoutes are not ready',
        reason: isReady ? 'Ready' : 'HTTPRoutesNotReady',
        severity: 'Info',
        status: isReady ? 'True' : 'False',
        type: 'Ready',
      },
      {
        lastTransitionTime,
        severity: 'Info',
        status: 'True',
        type: 'InferencePoolReady',
      },
      {
        lastTransitionTime,
        message: isReady ? '' : 'Deployment does not have minimum availability.',
        reason: isReady ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable',
        severity: 'Info',
        status: isReady ? 'True' : 'False',
        type: 'MainWorkloadReady',
      },
    ],
    url: url || `http://us-east-1.elb.amazonaws.com/${namespace}/${name}`,
    observedGeneration: 1,
  },
});
