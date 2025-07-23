import React from 'react';
import { renderHook } from '@odh-dashboard/internal/__tests__/unit/testUtils/hooks';
import { isEnabled } from '@odh-dashboard/internal/concepts/integrations/useIsComponentIntegrationEnabled';
import { IntegrationAppStatus } from '@odh-dashboard/internal/types.js';
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { useAvailableClusterPlatforms } from '../useAvailableClusterPlatforms';
import { ModelServingPlatform } from '../useProjectServingPlatform';
import { mockExtensions, mockModelServingPlatform } from '../../__tests__/mockUtils';

// Mock the required dependencies
jest.mock('@odh-dashboard/plugin-core');
jest.mock('@odh-dashboard/internal/concepts/integrations/useIsComponentIntegrationEnabled');

// Mock React.useContext
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = React.useContext as jest.Mock;
const mockIsEnabled = isEnabled as jest.Mock;

// Helper function to convert ModelServingPlatform to LoadedExtension format
const toLoadedExtension = (platform: ModelServingPlatform, index: number) => ({
  ...platform,
  pluginName: `mock-plugin-${platform.properties.id}`,
  uid: `mock-uid-${index}`,
});

describe('useAvailableClusterPlatforms', () => {
  let mockPlatforms: ModelServingPlatform[];
  let mockIntegrationStatus: Record<string, IntegrationAppStatus>;
  let mockRefresh: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock platforms
    mockPlatforms = [
      mockModelServingPlatform({
        id: 'kserve',
        title: 'KServe',
        namespaceApplicationCase: NamespaceApplicationCase.KSERVE_PROMOTION,
      }),
      mockModelServingPlatform({
        id: 'nim',
        title: 'NIM',
        namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
      }),
    ];

    // Setup mock integration status
    mockIntegrationStatus = {
      kserve: {
        isEnabled: true,
        isInstalled: true,
        canInstall: true,
        error: '',
      },
      nim: {
        isEnabled: true,
        isInstalled: true,
        canInstall: true,
        error: '',
      },
    };

    mockRefresh = jest.fn();

    // Setup default mocks
    mockExtensions(mockPlatforms.map(toLoadedExtension));
    mockIsEnabled.mockReturnValue(true);
  });

  it('should return all platforms when no integration requirements exist', () => {
    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual(mockPlatforms.map(toLoadedExtension));
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(result.current.clusterPlatformsError).toBeUndefined();
  });

  it('should filter platforms based on integration requirements', () => {
    // Create a platform with integration requirements
    const platformWithIntegration = mockModelServingPlatform({
      id: 'nim-integration',
      title: 'NIM with Integration',
      namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
    });

    // Add integration requirements
    platformWithIntegration.properties.manage.clusterRequirements = {
      integrationAppName: 'nim-service',
    };

    const allPlatforms = [
      mockPlatforms[0], // kserve without requirements
      platformWithIntegration, // nim with requirements
    ];

    mockExtensions(allPlatforms.map(toLoadedExtension));

    // Mock isEnabled to return false for the integration
    mockIsEnabled.mockImplementation((_, componentName) => componentName !== 'nim-service');

    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual([toLoadedExtension(mockPlatforms[0], 0)]);
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(mockIsEnabled).toHaveBeenCalledWith(mockIntegrationStatus, 'nim-service');
  });

  it('should include platforms with integration requirements when enabled', () => {
    // Create a platform with integration requirements
    const platformWithIntegration = mockModelServingPlatform({
      id: 'nim-integration',
      title: 'NIM with Integration',
      namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
    });

    platformWithIntegration.properties.manage.clusterRequirements = {
      integrationAppName: 'nim-service',
    };

    const allPlatforms = [
      mockPlatforms[0], // kserve without requirements
      platformWithIntegration, // nim with requirements
    ];

    mockExtensions(allPlatforms.map(toLoadedExtension));

    // Mock isEnabled to return true for the integration
    mockIsEnabled.mockImplementation((_, componentName) => componentName === 'nim-service');

    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual([
      toLoadedExtension(mockPlatforms[0], 0),
      toLoadedExtension(platformWithIntegration, 1),
    ]);
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(mockIsEnabled).toHaveBeenCalledWith(mockIntegrationStatus, 'nim-service');
  });

  it('should handle loading state correctly', () => {
    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: false,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual(mockPlatforms.map(toLoadedExtension));
    expect(result.current.clusterPlatformsLoaded).toBe(false);
    expect(result.current.clusterPlatformsError).toBeUndefined();
  });

  it('should handle error state correctly', () => {
    const mockError = new Error('Integration status error');
    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: mockError,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual(mockPlatforms.map(toLoadedExtension));
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(result.current.clusterPlatformsError).toBe(mockError);
  });

  it('should handle empty platforms array', () => {
    mockExtensions([]);

    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual([]);
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(result.current.clusterPlatformsError).toBeUndefined();
  });

  it('should handle empty integration status', () => {
    mockUseContext.mockReturnValue({
      integrationStatus: {},
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual(mockPlatforms.map(toLoadedExtension));
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(result.current.clusterPlatformsError).toBeUndefined();
  });

  it('should memoize platforms correctly when dependencies change', () => {
    // Create platform with integration requirements
    const platformWithIntegration = mockModelServingPlatform({
      id: 'nim-integration',
      title: 'NIM with Integration',
      namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
    });

    platformWithIntegration.properties.manage.clusterRequirements = {
      integrationAppName: 'nim-service',
    };

    const allPlatforms = [mockPlatforms[0], platformWithIntegration];
    mockExtensions(allPlatforms.map(toLoadedExtension));

    // Initially integration is disabled
    mockIsEnabled.mockImplementation((_, componentName) => componentName !== 'nim-service');

    const contextValue = {
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    };

    mockUseContext.mockReturnValue(contextValue);

    const { result, rerender } = renderHook(() => useAvailableClusterPlatforms());

    // Should only have kserve platform
    expect(result.current.clusterPlatforms).toEqual([toLoadedExtension(mockPlatforms[0], 0)]);

    // Now enable the integration by updating both the mock and the context
    mockIsEnabled.mockImplementation(() => true);

    // Update the context to trigger memoization update
    const updatedContextValue = {
      ...contextValue,
      integrationStatus: {
        ...mockIntegrationStatus,
        'nim-service': {
          isEnabled: true,
          isInstalled: true,
          canInstall: true,
          error: '',
        },
      },
    };
    mockUseContext.mockReturnValue(updatedContextValue);

    rerender();

    // Should now have both platforms
    expect(result.current.clusterPlatforms).toEqual(allPlatforms.map(toLoadedExtension));
  });

  it('should handle multiple platforms with different integration requirements', () => {
    // Create multiple platforms with different integration requirements
    const nimPlatform = mockModelServingPlatform({
      id: 'nim',
      title: 'NIM',
      namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
    });
    nimPlatform.properties.manage.clusterRequirements = {
      integrationAppName: 'nim-service',
    };

    const vllmPlatform = mockModelServingPlatform({
      id: 'vllm',
      title: 'vLLM',
      namespaceApplicationCase: NamespaceApplicationCase.MODEL_MESH_PROMOTION,
    });
    vllmPlatform.properties.manage.clusterRequirements = {
      integrationAppName: 'vllm-service',
    };

    const allPlatforms = [
      mockPlatforms[0], // kserve without requirements
      nimPlatform,
      vllmPlatform,
    ];

    mockExtensions(allPlatforms.map(toLoadedExtension));

    // Mock isEnabled to only allow nim-service
    mockIsEnabled.mockImplementation((_, componentName) => componentName === 'nim-service');

    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result } = renderHook(() => useAvailableClusterPlatforms());

    expect(result.current.clusterPlatforms).toEqual([
      toLoadedExtension(mockPlatforms[0], 0),
      toLoadedExtension(nimPlatform, 1),
    ]);
    expect(result.current.clusterPlatformsLoaded).toBe(true);
    expect(mockIsEnabled).toHaveBeenCalledWith(mockIntegrationStatus, 'nim-service');
    expect(mockIsEnabled).toHaveBeenCalledWith(mockIntegrationStatus, 'vllm-service');
  });

  it('should maintain referential equality when platforms do not change', () => {
    mockUseContext.mockReturnValue({
      integrationStatus: mockIntegrationStatus,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });

    const { result, rerender } = renderHook(() => useAvailableClusterPlatforms());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.clusterPlatforms).toBe(secondResult.clusterPlatforms);
  });
});
