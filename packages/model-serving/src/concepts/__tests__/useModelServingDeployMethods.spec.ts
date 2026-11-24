import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { Deployment } from '../../../extension-points';
import type { ModelServingDeploy } from '../../../extension-points/deployment-wizard';
import { isModelServingDeploy } from '../../../extension-points/deployment-wizard';
import { useModelServingDeployMethods } from '../useModelServingDeployMethods';

jest.mock('@odh-dashboard/plugin-core');

const mockUseExtensions = jest.mocked(useExtensions);

const mockDeployMethod = (platform: string): LoadedExtension<ModelServingDeploy<Deployment>> => {
  const deployment: Deployment = {
    modelServingPlatformId: platform,
    model: {
      apiVersion: 'example.com/v1',
      kind: 'Model',
      metadata: {
        name: `${platform}-model`,
        namespace: 'test-project',
      },
    },
  };

  return {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform,
      isActive: true,
      priority: 0,
      deploy: async () => async () => deployment,
    },
    pluginName: `${platform}-plugin`,
    uid: `${platform}-extension`,
  };
};

describe('useModelServingDeployMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaded deploy methods and report methods are available', () => {
    const kserveMethod = mockDeployMethod('kserve');
    const llmdMethod = mockDeployMethod('llmd');
    mockUseExtensions.mockReturnValue([kserveMethod, llmdMethod]);

    const renderResult = testHook(useModelServingDeployMethods)();

    expect(renderResult).hookToStrictEqual({
      deployMethods: [kserveMethod, llmdMethod],
      hasDeployMethods: true,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockUseExtensions).toHaveBeenCalledTimes(1);
    expect(mockUseExtensions).toHaveBeenCalledWith(isModelServingDeploy);
  });

  it('should report methods are unavailable when no deploy methods are loaded', () => {
    mockUseExtensions.mockReturnValue([]);

    const renderResult = testHook(useModelServingDeployMethods)();

    expect(renderResult).hookToStrictEqual({
      deployMethods: [],
      hasDeployMethods: false,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockUseExtensions).toHaveBeenCalledWith(isModelServingDeploy);
  });
});
