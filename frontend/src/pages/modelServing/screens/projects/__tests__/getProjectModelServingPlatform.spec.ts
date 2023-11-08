import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';

describe('getProjectModelServingPlatform', () => {
  it('should return undefined if both KServe and ModelMesh are disabled, and project has no platform label', () => {
    expect(getProjectModelServingPlatform(mockProjectK8sResource({}), true, true)).toBeUndefined();
  });
  it('should return undefined if both KServe and ModelMesh are enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(mockProjectK8sResource({}), false, false),
    ).toBeUndefined();
  });
  it('should return Single Platform if has platform label set to false, no matter whether the feature flags are enabled or not', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        true,
        true,
      ),
    ).toBe(ServingRuntimePlatform.SINGLE);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        true,
        false,
      ),
    ).toBe(ServingRuntimePlatform.SINGLE);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        false,
        true,
      ),
    ).toBe(ServingRuntimePlatform.SINGLE);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        false,
        false,
      ),
    ).toBe(ServingRuntimePlatform.SINGLE);
  });
  it('should return Multi Platform if has platform label set to true, no matter whether the feature flags are enabled or not', () => {
    expect(
      getProjectModelServingPlatform(mockProjectK8sResource({ enableModelMesh: true }), true, true),
    ).toBe(ServingRuntimePlatform.MULTI);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        true,
        false,
      ),
    ).toBe(ServingRuntimePlatform.MULTI);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        false,
        true,
      ),
    ).toBe(ServingRuntimePlatform.MULTI);
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        false,
        false,
      ),
    ).toBe(ServingRuntimePlatform.MULTI);
  });
  it('should return Single Platform if only KServe is enabled, and project has no platform label', () => {
    expect(getProjectModelServingPlatform(mockProjectK8sResource({}), false, true)).toBe(
      ServingRuntimePlatform.SINGLE,
    );
  });
  it('should return Multi Platform if only ModelMesh is enabled, and project has no platform label', () => {
    expect(getProjectModelServingPlatform(mockProjectK8sResource({}), true, false)).toBe(
      ServingRuntimePlatform.MULTI,
    );
  });
});
