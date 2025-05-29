import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '#~/__mocks__/mockServingRuntimeK8sResource';
import { ServingRuntimeKind } from '#~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getEnabledPlatformsFromTemplate,
  getServingRuntimeVersion,
  getTemplateEnabledForPlatform,
  isTemplateKind,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '#~/types';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';

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

describe('getServingRuntimeVersionFromTemplate', () => {
  it('should return the version from the annotation', () => {
    const servingRuntime = mockServingRuntimeK8sResource({});
    servingRuntime.metadata.annotations = {
      'opendatahub.io/runtime-version': '1.0.0',
    };
    expect(getServingRuntimeVersion(servingRuntime)).toBe('1.0.0');
  });

  it('should return empty string if annotation is not present', () => {
    const servingRuntime = mockServingRuntimeK8sResource({});
    expect(getServingRuntimeVersion(servingRuntime)).toBe(undefined);
  });
});

describe('isTemplateKind', () => {
  it('should return true if the resource is a template', () => {
    const template = mockServingRuntimeTemplateK8sResource({});
    expect(isTemplateKind(template)).toBe(true);
  });
  it('should return false if the resource is not a template', () => {
    const servingRuntime = mockServingRuntimeK8sResource({});
    expect(isTemplateKind(servingRuntime)).toBe(false);
  });
});
