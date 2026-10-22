import { renderHook } from '@testing-library/react';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { mockDeploymentWizardState, mockExtensions } from '../../../../__tests__/mockUtils';
import { useIsDRAHardwareProfileSupported } from '../useIsDRAHardwareProfileSupported';

jest.mock('@odh-dashboard/plugin-core');

const mockDeployExtension = ({
  platform,
  priority,
  isActive,
  supportsDRAHardwareProfiles,
}: {
  platform: string;
  priority: number;
  isActive: boolean;
  supportsDRAHardwareProfiles?: boolean;
}): LoadedExtension<Extension> => ({
  uid: platform,
  type: 'model-serving.deployment/deploy',
  pluginID: '',
  pluginName: '',
  properties: {
    platform,
    priority,
    isActive: () => isActive,
    deploy: jest.fn(),
    ...(supportsDRAHardwareProfiles !== undefined && { supportsDRAHardwareProfiles }),
  },
});

const kserveDeploy = mockDeployExtension({
  platform: 'kserve',
  priority: 0,
  isActive: true,
  supportsDRAHardwareProfiles: true,
});

const renderSupported = () =>
  renderHook(() => useIsDRAHardwareProfileSupported(mockDeploymentWizardState().state));

describe('useIsDRAHardwareProfileSupported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when the active deploy method opts in to DRA hardware profiles', () => {
    mockExtensions([kserveDeploy]);

    expect(renderSupported().result.current).toBe(true);
  });

  it('should return false when a higher priority deploy method without DRA support is active', () => {
    mockExtensions([
      kserveDeploy,
      mockDeployExtension({ platform: 'nvidia-nim-service', priority: 100, isActive: true }),
    ]);

    expect(renderSupported().result.current).toBe(false);
  });

  it('should use the opt-in of the deploy method that is active', () => {
    mockExtensions([
      kserveDeploy,
      mockDeployExtension({ platform: 'nvidia-nim-service', priority: 100, isActive: false }),
      mockDeployExtension({
        platform: 'llmd-serving',
        priority: 100,
        isActive: true,
        supportsDRAHardwareProfiles: true,
      }),
    ]);

    expect(renderSupported().result.current).toBe(true);
  });

  it('should return undefined while the deploy methods are still resolving', () => {
    const { mockUseResolvedExtensions } = mockExtensions([kserveDeploy]);
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);

    expect(renderSupported().result.current).toBeUndefined();
  });

  it('should return false when no deploy method is active', () => {
    mockExtensions([]);

    expect(renderSupported().result.current).toBe(false);
  });
});
