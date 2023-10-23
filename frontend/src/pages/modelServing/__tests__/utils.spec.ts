import { mockDataScienceStatus } from '~/__mocks__/mockDSCStatus';
import {
  checkKserveFailureStatus,
  checkModelMeshFailureStatus,
  checkPlatformAvailability,
  resourcesArePositive,
} from '~/pages/modelServing/utils';
import { ContainerResources } from '~/types';

describe('resourcesArePositive', () => {
  it('should return true for undefined limits and request', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return false for resources with zero limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 0, memory: '0Gi' },
      requests: { cpu: 0, memory: '0Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return false for resources with negative limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '-1', memory: '-1Mi' },
      requests: { cpu: '-1', memory: '-1Mi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return true for resources with positive limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1', memory: '1Gi' },
      requests: { cpu: '1', memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with positive limits and undefined requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 1, memory: '1Gi' },
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with undefined limits and positive requests', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: { cpu: 1, memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });
});

describe('servingPlatformsInstallaed', () => {
  it('should return true for kserve but false for model-mesh', () => {
    const mockedDataScienceStatusKserve = mockDataScienceStatus({
      kserveEnabled: true,
      modelMeshEnabled: false,
    });

    expect(checkPlatformAvailability(mockedDataScienceStatusKserve)).toEqual({
      kServeAvailable: true,
      modelMeshAvailable: false,
    });
  });

  it('should return false for kserve but true for model-mesh', () => {
    const mockedDataScienceStatusKserve = mockDataScienceStatus({
      kserveEnabled: false,
      modelMeshEnabled: true,
    });

    expect(checkPlatformAvailability(mockedDataScienceStatusKserve)).toEqual({
      kServeAvailable: false,
      modelMeshAvailable: true,
    });
  });

  it('should return false for both kserve and model-mesh', () => {
    const mockedDataScienceStatusKserve = mockDataScienceStatus({
      kserveEnabled: false,
      modelMeshEnabled: false,
    });

    expect(checkPlatformAvailability(mockedDataScienceStatusKserve)).toEqual({
      kServeAvailable: false,
      modelMeshAvailable: false,
    });
  });

  it('should not find any status issue for kserve', () => {
    const mockedDataScienceStatusKserve = mockDataScienceStatus({});

    expect(checkKserveFailureStatus(mockedDataScienceStatusKserve)).toEqual('');
  });

  it('should find an issue with kserve', () => {
    const errorMessage =
      'Component reconciliation failed: operator servicemeshoperator not found. Please install the operator before enabling kserve component';
    const mockedDataScienceStatusKserve = mockDataScienceStatus({
      conditions: [
        {
          lastHeartbeatTime: '2023-10-20T11:31:24Z',
          lastTransitionTime: '2023-10-15T19:04:21Z',
          message:
            'DataScienceCluster resource reconciled with component errors: 1 error occurred:\n\t* operator servicemeshoperator not found. Please install the operator before enabling kserve component',
          reason: 'ReconcileCompletedWithComponentErrors',
          status: 'True',
          type: 'ReconcileComplete',
        },
        {
          lastHeartbeatTime: '2023-10-20T11:31:19Z',
          lastTransitionTime: '2023-10-20T11:31:19Z',
          message: errorMessage,
          reason: 'ReconcileFailed',
          status: 'False',
          type: 'kserveReady',
        },
      ],
    });

    expect(checkKserveFailureStatus(mockedDataScienceStatusKserve)).toEqual(errorMessage);
  });

  it('should find an issue with modelMesh', () => {
    const errorMessage =
      'Component reconciliation failed: CustomResourceDefinition.apiextensions.k8s.io "inferenceservices.serving.kserve.io" is invalid: [spec.conversion.strategy: Required value, spec.conversion.webhookClientConfig: Forbidden: should not be set when strategy is not set to Webhook]';
    const mockedDataScienceStatusKserve = mockDataScienceStatus({
      conditions: [
        {
          lastHeartbeatTime: '2023-10-20T11:31:24Z',
          lastTransitionTime: '2023-10-15T19:04:21Z',
          message:
            'DataScienceCluster resource reconciled with component errors: 1 error occurred:\n\t* CustomResourceDefinition.apiextensions.k8s.io "inferenceservices.serving.kserve.io" is invalid: [spec.conversion.strategy: Required value, spec.conversion.webhookClientConfig: Forbidden: should not be set when strategy is not set to Webhook]',
          reason: 'ReconcileCompletedWithComponentErrors',
          status: 'True',
          type: 'ReconcileComplete',
        },
        {
          lastHeartbeatTime: '2023-10-20T11:31:19Z',
          lastTransitionTime: '2023-10-20T11:31:19Z',
          message: errorMessage,
          reason: 'ReconcileFailed',
          status: 'False',
          type: 'model-meshReady',
        },
      ],
    });

    expect(checkModelMeshFailureStatus(mockedDataScienceStatusKserve)).toEqual(errorMessage);
  });
});
