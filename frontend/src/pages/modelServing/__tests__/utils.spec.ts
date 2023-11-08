import { mockDataScienceStatus } from '~/__mocks__/mockDSCStatus';
import {
  checkKserveFailureStatus,
  checkModelMeshFailureStatus,
  checkPlatformAvailability,
  resourcesArePositive,
} from '~/pages/modelServing/utils';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '~/__mocks__/mockServingRuntimeK8sResource';
import { ServingRuntimeKind } from '~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getEnabledPlatformsFromTemplate,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ContainerResources, ServingRuntimePlatform } from '~/types';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';

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

describe('getDisplayNameFromServingRuntimeTemplate', () => {
  it('should provide default name if not found', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate({
      metadata: {},
      spec: {},
    } as ServingRuntimeKind);
    expect(servingRuntime).toBe('Unknown Serving Runtime');
  });

  it('should prioritize name from annotation "opendatahub.io/template-display-name"', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(
      mockServingRuntimeK8sResource({}),
    );
    expect(servingRuntime).toBe('OpenVINO Serving Runtime (Supports GPUs)');
  });

  it('should fallback first to name from annotation "opendatahub.io/template-name"', () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({});
    delete mockServingRuntime.metadata.annotations?.['opendatahub.io/template-display-name'];
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(mockServingRuntime);
    expect(servingRuntime).toBe('ovms');
  });

  it('should fallback to ovms serverType', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(
      mockServingRuntimeK8sResourceLegacy({}),
    );
    expect(servingRuntime).toBe('OpenVINO Model Server');
  });
});

describe('getTemplateEnabledForPlatform', () => {
  it('should be true if template supports both', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeTruthy();
  });

  it('should be false if template supports MULTI but we pass SINGLE as check', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.MULTI],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeFalsy();
  });

  it('should be true if template supports SINGLE but we pass SINGLE as check', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeTruthy();
  });
});

describe('getEnabledPlatformsFromTemplate', () => {
  it('should return only MULTI if annotation is empty', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.MULTI,
    ]);
  });

  it('should return only MULTI if no annotation', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [],
    });

    delete teamplateAllPlatforms.metadata.annotations?.['opendatahub.io/modelServingSupport'];

    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.MULTI,
    ]);
  });

  it('should return only SINGLE', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.SINGLE,
    ]);
  });

  it('should return both platforms', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.SINGLE,
      ServingRuntimePlatform.MULTI,
    ]);
  });
});
