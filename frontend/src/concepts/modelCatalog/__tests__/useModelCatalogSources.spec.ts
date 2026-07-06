import { renderHook, act } from '@testing-library/react';
import { getConfigMap } from '#~/api';
import { useIsAreaAvailable } from '#~/concepts/areas';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { useModelCatalogSources } from '#~/concepts/modelCatalog/useModelCatalogSources';
import {
  MODEL_CATALOG_SOURCES_CONFIGMAP,
  MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP,
} from '#~/concepts/modelCatalog/const';

// Mock the dependencies
jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  isK8sStatus: jest.fn().mockReturnValue(true),
}));

jest.mock('#~/pages/notebookController/useNamespaces', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/concepts/areas', () => ({
  useIsAreaAvailable: jest.fn(),
}));

describe('useModelCatalogSources', () => {
  const mockDashboardNamespace = 'test-namespace';
  const mockModelCatalogSources = {
    sources: [
      { name: 'source1', url: 'http://source1.com' },
      { name: 'source2', url: 'http://source2.com' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNamespaces as jest.Mock).mockReturnValue({ dashboardNamespace: mockDashboardNamespace });
    (useIsAreaAvailable as jest.Mock).mockReturnValue({ status: true });
  });

  describe('when model catalog is not available', () => {
    it('should return empty array', async () => {
      (useIsAreaAvailable as jest.Mock).mockReturnValue({ status: false });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
      expect(result.current[1]).toBe(false);
    });
  });

  describe('when fetching model catalog sources', () => {
    it('should handle multiple config maps', async () => {
      const mockUnmanagedSources = {
        sources: [{ name: 'unmanaged1', url: 'http://unmanaged1.com' }],
      };

      (getConfigMap as jest.Mock).mockImplementation((namespace, name) => {
        if (name === MODEL_CATALOG_SOURCES_CONFIGMAP) {
          return Promise.resolve({
            data: {
              modelCatalogSources: JSON.stringify(mockModelCatalogSources),
            },
          });
        }
        if (name === MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP) {
          return Promise.resolve({
            data: {
              modelCatalogSources: JSON.stringify(mockUnmanagedSources),
            },
          });
        }
        return Promise.reject({ statusObject: { code: 404 } });
      });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([
        ...mockModelCatalogSources.sources,
        ...mockUnmanagedSources.sources,
      ]);
    });

    it('should return empty array when config map is not found', async () => {
      (getConfigMap as jest.Mock).mockRejectedValue({ statusObject: { code: 404 } });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
    });
  });

  describe('when handling invalid data', () => {
    it('should handle invalid JSON data', async () => {
      (getConfigMap as jest.Mock).mockImplementation((namespace, name) => {
        if (name === MODEL_CATALOG_SOURCES_CONFIGMAP) {
          return Promise.resolve({
            data: {
              modelCatalogSources: 'invalid-json',
            },
          });
        }
        return Promise.reject({ statusObject: { code: 404 } });
      });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
    });

    it('should handle missing modelCatalogSources field', async () => {
      (getConfigMap as jest.Mock).mockImplementation((namespace, name) => {
        if (name === MODEL_CATALOG_SOURCES_CONFIGMAP) {
          return Promise.resolve({
            data: {},
          });
        }
        return Promise.reject({ statusObject: { code: 404 } });
      });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
    });
  });

  describe('when handling errors', () => {
    it('should handle API errors', async () => {
      (getConfigMap as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
      expect(result.current[2]).toBeDefined();
    });

    it('should handle non-404 errors', async () => {
      (getConfigMap as jest.Mock).mockRejectedValue({ statusObject: { code: 500 } });

      const { result } = renderHook(() => useModelCatalogSources());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current[0]).toEqual([]);
      expect(result.current[2]).toBeDefined();
    });
  });
});
