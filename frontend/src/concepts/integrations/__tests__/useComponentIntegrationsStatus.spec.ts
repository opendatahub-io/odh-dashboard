import { renderHook } from '@testing-library/react';
import { IntegrationAppStatus } from '#~/types';
import { useComponentIntegrationsStatus } from '#~/concepts/integrations/useComponentIntegrationsStatus';

// Mock dependencies
jest.mock('#~/utilities/useFetch');
jest.mock('#~/services/componentsServices');
jest.mock('#~/services/integrationAppService');
jest.mock('#~/utilities/utils.ts');

const mockUseFetch = jest.requireMock('#~/utilities/useFetch').default;
const mockFetchComponents = jest.requireMock('#~/services/componentsServices').fetchComponents;
const mockGetIntegrationAppEnablementStatus = jest.requireMock(
  '#~/services/integrationAppService',
).getIntegrationAppEnablementStatus;
const mockIsIntegrationApp = jest.requireMock('#~/utilities/utils.ts').isIntegrationApp;

describe('useComponentIntegrationsStatus', () => {
  const mockIntegrationStatus: IntegrationAppStatus = {
    isEnabled: true,
    isInstalled: true,
    canInstall: true,
    error: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty object when no integration apps exist', () => {
    mockUseFetch.mockReturnValue({
      data: {},
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useComponentIntegrationsStatus());

    expect(result.current.data).toEqual({});
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should return integration statuses for valid apps', () => {
    const mockData = {
      app1: mockIntegrationStatus,
      app2: { ...mockIntegrationStatus, isEnabled: false },
    };

    mockUseFetch.mockReturnValue({
      data: mockData,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useComponentIntegrationsStatus());

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loaded).toBe(true);
  });

  it('should handle fetch errors correctly', () => {
    const mockError = new Error('Fetch failed');
    mockUseFetch.mockReturnValue({
      data: {},
      loaded: false,
      error: mockError,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useComponentIntegrationsStatus());

    expect(result.current.error).toBe(mockError);
    expect(result.current.loaded).toBe(false);
  });

  it('should call useFetch with correct callback', () => {
    const mockComponents = [
      { metadata: { name: 'app1' }, spec: { internalRoute: '/api/app1' } },
      { metadata: { name: 'app2' }, spec: { internalRoute: '/api/app2' } },
    ];

    mockFetchComponents.mockResolvedValue(mockComponents);
    mockIsIntegrationApp.mockReturnValue(true);
    mockGetIntegrationAppEnablementStatus.mockResolvedValue(mockIntegrationStatus);

    mockUseFetch.mockReturnValue({
      data: {},
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    renderHook(() => useComponentIntegrationsStatus());

    expect(mockUseFetch).toHaveBeenCalledWith(expect.any(Function), []);
  });
});
