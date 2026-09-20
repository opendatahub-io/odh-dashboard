import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { Deployment } from '../../../extension-points';
import { useResolvedDeploymentExtension, type PlatformExtension } from '../extensionUtils';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
}));

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);

const deployment = { modelServingPlatformId: 'kserve' } as Deployment;

const makeExtension = (
  isActive: (value: Deployment) => boolean,
  priority: number,
): PlatformExtension =>
  ({
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: 'kserve',
      isActive,
      priority,
    },
  } as PlatformExtension);

describe('useResolvedDeploymentExtension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters extensions by isActive before selecting the highest priority', () => {
    const inactive = jest.fn(() => false);
    const active = jest.fn(() => true);
    const inactiveHigherPriority = makeExtension(inactive, 100);
    const activeLowerPriority = makeExtension(active, 50);
    mockUseResolvedExtensions.mockReturnValue([
      [inactiveHigherPriority, activeLowerPriority],
      true,
      [],
    ] as never);

    const extensionPredicate = (() => true) as unknown as ExtensionPredicate<PlatformExtension>;
    const result = testHook(useResolvedDeploymentExtension)(extensionPredicate, deployment);

    expect(result.result.current[0]).toBe(activeLowerPriority);
    expect(inactive).toHaveBeenCalledWith(deployment);
    expect(active).toHaveBeenCalledWith(deployment);
  });
});
