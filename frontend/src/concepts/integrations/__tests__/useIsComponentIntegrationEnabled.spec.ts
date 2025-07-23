import React, { act } from 'react';
import { renderHook } from '@testing-library/react';
import { IntegrationAppStatus } from '#~/types';
import {
  useIsComponentIntegrationEnabled,
  isEnabled,
} from '#~/concepts/integrations/useIsComponentIntegrationEnabled';
import { IntegrationsStatusContextType } from '#~/concepts/integrations/IntegrationsStatusContext';

// Mock React.useContext directly
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = React.useContext as jest.Mock;

describe('useIsComponentIntegrationEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isEnabled helper function', () => {
    it('should return true when component is both enabled and installed', () => {
      const components: Record<string, IntegrationAppStatus> = {
        testComponent: {
          isEnabled: true,
          isInstalled: true,
          canInstall: true,
          error: '',
        },
      };

      const result = isEnabled(components, 'testComponent');
      expect(result).toBe(true);
    });

    it('should return false when component is enabled but not installed', () => {
      const components: Record<string, IntegrationAppStatus> = {
        testComponent: {
          isEnabled: true,
          isInstalled: false,
          canInstall: true,
          error: '',
        },
      };

      const result = isEnabled(components, 'testComponent');
      expect(result).toBe(false);
    });

    it('should return false when component is installed but not enabled', () => {
      const components: Record<string, IntegrationAppStatus> = {
        testComponent: {
          isEnabled: false,
          isInstalled: true,
          canInstall: true,
          error: '',
        },
      };

      const result = isEnabled(components, 'testComponent');
      expect(result).toBe(false);
    });

    it('should return false when component does not exist', () => {
      const components: Record<string, IntegrationAppStatus> = {};

      const result = isEnabled(components, 'nonExistentComponent');
      expect(result).toBe(false);
    });
  });

  describe('useIsComponentIntegrationEnabled hook', () => {
    it('should return correct state when component is enabled', () => {
      const mockRefresh = jest.fn();
      const mockContextValue: IntegrationsStatusContextType = {
        integrationStatus: {
          testComponent: {
            isEnabled: true,
            isInstalled: true,
            canInstall: true,
            error: '',
          },
        },
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      };

      mockUseContext.mockReturnValue(mockContextValue);

      const { result } = renderHook(() => useIsComponentIntegrationEnabled('testComponent'));

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.loaded).toBe(true);
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should return correct state when component is disabled', () => {
      const mockRefresh = jest.fn();
      const mockContextValue: IntegrationsStatusContextType = {
        integrationStatus: {
          testComponent: {
            isEnabled: false,
            isInstalled: true,
            canInstall: true,
            error: '',
          },
        },
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      };

      mockUseContext.mockReturnValue(mockContextValue);

      const { result } = renderHook(() => useIsComponentIntegrationEnabled('testComponent'));

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.loaded).toBe(true);
      expect(result.current.error).toBeUndefined();
    });

    it('should handle refresh callback correctly', async () => {
      const mockRefresh = jest.fn().mockResolvedValue({
        testComponent: {
          isEnabled: true,
          isInstalled: true,
          canInstall: true,
          error: '',
        },
      });

      const mockContextValue: IntegrationsStatusContextType = {
        integrationStatus: {},
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      };

      mockUseContext.mockReturnValue(mockContextValue);

      const { result } = renderHook(() => useIsComponentIntegrationEnabled('testComponent'));

      let refreshResult: boolean | undefined;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(refreshResult).toBe(true);
    });

    it('should handle error state from context', () => {
      const mockError = new Error('Test error');
      const mockContextValue: IntegrationsStatusContextType = {
        integrationStatus: {},
        loaded: false,
        error: mockError,
        refresh: jest.fn(),
      };

      mockUseContext.mockReturnValue(mockContextValue);

      const { result } = renderHook(() => useIsComponentIntegrationEnabled('testComponent'));

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.loaded).toBe(false);
      expect(result.current.error).toBe(mockError);
    });

    it('should handle refresh returning undefined', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);

      const mockContextValue: IntegrationsStatusContextType = {
        integrationStatus: {},
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      };

      mockUseContext.mockReturnValue(mockContextValue);

      const { result } = renderHook(() => useIsComponentIntegrationEnabled('testComponent'));

      let refreshResult: boolean | undefined;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(refreshResult).toBe(false);
    });
  });
});
