import { resourcesArePositive } from '~/pages/modelServing/utils';
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
