import { TrustyAIKind } from '~/k8sTypes';

export const mockTrustyAIServiceK8sResource = (): TrustyAIKind => ({
  apiVersion: 'trustyai.opendatahub.io.trustyai.opendatahub.io/v1alpha1',
  kind: 'TrustyAIService',
  metadata: {
    name: 'trustyai-service',
    namespace: 'model-namespace',
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
      folder: '/inputs',
      format: 'PVC',
      size: '1Gi',
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
        message: 'PersistentVolumeClaim found',
        reason: 'PVCFound',
        status: 'True',
        type: 'PVCAvailable',
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
        type: 'Available',
      },
    ],
    phase: 'Ready',
    ready: 'True',
    replicas: 0,
  },
});
