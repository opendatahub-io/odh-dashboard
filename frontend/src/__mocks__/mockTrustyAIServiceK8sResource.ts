import { TrustyAIKind } from '#~/k8sTypes';

type MockTrustyAIServiceK8sResourceOptions = {
  isAvailable?: boolean;
  creationTimestamp?: string;
  namespace?: string;
};

export const mockTrustyAIServiceForDbK8sResource = ({
  isAvailable = true,
  creationTimestamp = new Date().toISOString(),
  namespace = 'test-project',
}: MockTrustyAIServiceK8sResourceOptions): TrustyAIKind => ({
  apiVersion: 'trustyai.opendatahub.io.trustyai.opendatahub.io/v1alpha1',
  kind: 'TrustyAIService',
  metadata: {
    name: 'trustyai-service',
    namespace,
    creationTimestamp,
  },
  spec: {
    data: {
      filename: 'data.csv',
      format: 'CSV',
    },
    metrics: {
      schedule: '5s',
    },
    storage: {
      format: 'DATABASE',
      databaseConfigurations: 'test-secret',
    },
  },
  status: {
    conditions: [
      {
        lastTransitionTime: '2024-01-11T18:29:06Z',
        message: 'InferenceServices found',
        reason: 'InferenceServicesFound',
        status: 'True',
        type: 'InferenceServicesPresent',
      },
      {
        lastTransitionTime: '2024-01-11T18:29:06Z',
        message: 'Database connected',
        reason: 'DBConnected',
        status: 'True',
        type: 'DBAvailable',
      },
      {
        lastTransitionTime: '2024-01-11T18:29:06Z',
        message: 'Route found',
        reason: 'RouteFound',
        status: 'True',
        type: 'RouteAvailable',
      },
      {
        lastTransitionTime: '2024-01-11T18:29:06Z',
        message: 'AllComponentsReady',
        reason: 'AllComponentsReady',
        status: 'True',
        type: isAvailable ? 'Available' : 'Progressing',
      },
    ],
    phase: 'Ready',
    ready: 'True',
    replicas: 0,
  },
});
