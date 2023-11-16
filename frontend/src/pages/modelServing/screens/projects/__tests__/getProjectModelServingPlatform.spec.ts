import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';

const getMockServingPlatformStatuses = ({
  kServeEnabled = true,
  kServeInstalled = true,
  modelMeshEnabled = true,
  modelMeshInstalled = true,
}): ServingPlatformStatuses => ({
  kServe: {
    enabled: kServeEnabled,
    installed: kServeInstalled,
  },
  modelMesh: {
    enabled: modelMeshEnabled,
    installed: modelMeshInstalled,
  },
});

describe('getProjectModelServingPlatform', () => {
  it('should return undefined if both KServe and ModelMesh are disabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false, modelMeshEnabled: false }),
      ),
    ).toStrictEqual({});
  });
  it('should return undefined if both KServe and ModelMesh are enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({});
  });
  it('should return Single Platform if has platform label set to false and KServe is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
  it('should give error if has platform label set to false and KServe is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false, kServeInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Multi Platform if has platform label set to true and ModelMesh is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
  });
  it('should give error if has platform label set to true and ModelMesh is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false, modelMeshInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Single Platform if only KServe is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE });
  });
  it('should return Multi Platform if only ModelMesh is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI });
  });
});
