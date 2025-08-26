import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import useMetricsResourceCount from '../useMetricsResourceCount';
import { MetricsCountResponse } from '../../types/metrics';

jest.mock('../../FeatureStoreContext');
const mockUseFeatureStoreAPI = useFeatureStoreAPI as jest.MockedFunction<typeof useFeatureStoreAPI>;

jest.mock('@odh-dashboard/internal/utilities/useFetch');
const mockUseFetch = jest.fn();

describe('useMetricsResourceCount', () => {
  const mockApi = {
    getMetricsResourceCount: jest.fn(),
  };

  const mockMetricsResponse: MetricsCountResponse = {
    total: {
      entities: 6,
      dataSources: 8,
      savedDatasets: 9,
      features: 41,
      featureViews: 6,
      featureServices: 12,
    },
    perProject: {
      rbac: {
        entities: 2,
        dataSources: 3,
        savedDatasets: 0,
        features: 10,
        featureViews: 2,
        featureServices: 3,
      },
      // eslint-disable-next-line camelcase
      credit_scoring_local: {
        entities: 4,
        dataSources: 5,
        savedDatasets: 9,
        features: 31,
        featureViews: 4,
        featureServices: 9,
      },
    },
  };

  const mockProjectMetricsResponse: MetricsCountResponse = {
    project: 'rbac',
    counts: {
      entities: 2,
      dataSources: 3,
      savedDatasets: 0,
      features: 10,
      featureViews: 2,
      featureServices: 3,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureStoreAPI.mockReturnValue({
      api: mockApi,
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);
  });

  describe('when API is available', () => {
    describe('without project parameter', () => {
      it('should call getMetricsResourceCount without project parameter', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);
        mockUseFetch.mockReturnValue({
          data: mockMetricsResponse,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        });

        renderHook(() => useMetricsResourceCount({}));

        await waitFor(() => {
          expect(mockApi.getMetricsResourceCount).toHaveBeenCalledWith(expect.any(Object));
          expect(mockApi.getMetricsResourceCount).not.toHaveBeenCalledWith(
            expect.any(Object),
            'rbac',
          );
        });
      });

      it('should return metrics data for all projects', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);
        mockUseFetch.mockReturnValue({
          data: mockMetricsResponse,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        });

        const { result } = renderHook(() => useMetricsResourceCount({}));

        expect(result.current.data).toEqual(mockMetricsResponse);
        expect(result.current.loaded).toBe(true);
        expect(result.current.error).toBeUndefined();
      });
    });

    describe('with project parameter', () => {
      it('should call getMetricsResourceCount with project parameter', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockProjectMetricsResponse);
        mockUseFetch.mockReturnValue({
          data: mockProjectMetricsResponse,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        });

        renderHook(() => useMetricsResourceCount({ project: 'rbac' }));

        await waitFor(() => {
          expect(mockApi.getMetricsResourceCount).toHaveBeenCalledWith(expect.any(Object), 'rbac');
        });
      });

      it('should return metrics data for specific project', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockProjectMetricsResponse);
        mockUseFetch.mockReturnValue({
          data: mockProjectMetricsResponse,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        });

        const { result } = renderHook(() => useMetricsResourceCount({ project: 'rbac' }));

        expect(result.current.data).toEqual(mockProjectMetricsResponse);
        expect(result.current.loaded).toBe(true);
        expect(result.current.error).toBeUndefined();
      });
    });

    describe('API call behavior', () => {
      it('should handle successful API response', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);
        mockUseFetch.mockReturnValue({
          data: mockMetricsResponse,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        });

        const { result } = renderHook(() => useMetricsResourceCount({}));

        expect(result.current.data).toEqual(mockMetricsResponse);
        expect(result.current.loaded).toBe(true);
      });

      it('should handle API error', async () => {
        const mockError = new Error('API Error');
        mockApi.getMetricsResourceCount.mockRejectedValue(mockError);
        mockUseFetch.mockReturnValue({
          data: undefined,
          loaded: false,
          error: mockError,
          refresh: jest.fn(),
        });

        const { result } = renderHook(() => useMetricsResourceCount({}));

        expect(result.current.error).toEqual(mockError);
        expect(result.current.loaded).toBe(false);
      });
    });
  });

  describe('when API is not available', () => {
    it('should reject with error when API is not available', async () => {
      mockUseFeatureStoreAPI.mockReturnValue({
        api: mockApi,
        apiAvailable: false,
      } as unknown as ReturnType<typeof useFeatureStoreAPI>);

      const { result } = renderHook(() => useMetricsResourceCount({}));

      // The hook should still return the initial state even when API is not available
      expect(result.current.data).toEqual({
        total: undefined,
        perProject: undefined,
        project: undefined,
        counts: undefined,
      });
    });
  });

  describe('initial state', () => {
    it('should return initial state with undefined values', () => {
      mockUseFetch.mockReturnValue({
        data: {
          total: undefined,
          perProject: undefined,
          project: undefined,
          counts: undefined,
        },
        loaded: false,
        error: undefined,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useMetricsResourceCount({}));

      expect(result.current.data).toEqual({
        total: undefined,
        perProject: undefined,
        project: undefined,
        counts: undefined,
      });
      expect(result.current.loaded).toBe(false);
    });
  });

  describe('hook dependencies', () => {
    it('should recreate callback when project changes', () => {
      const { rerender } = renderHook(({ project }) => useMetricsResourceCount({ project }), {
        initialProps: { project: 'rbac' },
      });

      rerender({ project: 'credit_scoring_local' });

      // The callback should be recreated due to project dependency change
      expect(mockApi.getMetricsResourceCount).not.toHaveBeenCalled();
    });

    it('should recreate callback when API changes', () => {
      const { rerender } = renderHook(() => useMetricsResourceCount({}));

      // Change the API reference
      const newMockApi = { getMetricsResourceCount: jest.fn() };
      mockUseFeatureStoreAPI.mockReturnValue({
        api: newMockApi,
        apiAvailable: true,
      } as unknown as ReturnType<typeof useFeatureStoreAPI>);

      rerender();

      // The callback should be recreated due to API dependency change
      expect(newMockApi.getMetricsResourceCount).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty project string', () => {
      mockUseFetch.mockReturnValue({
        data: mockMetricsResponse,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useMetricsResourceCount({ project: '' }));

      expect(result.current.data).toEqual(mockMetricsResponse);
    });

    it('should handle undefined project', () => {
      mockUseFetch.mockReturnValue({
        data: mockMetricsResponse,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useMetricsResourceCount({ project: undefined }));

      expect(result.current.data).toEqual(mockMetricsResponse);
    });

    it('should handle null project', () => {
      mockUseFetch.mockReturnValue({
        data: mockMetricsResponse,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMetricsResourceCount({ project: null as unknown as string }),
      );

      expect(result.current.data).toEqual(mockMetricsResponse);
    });
  });

  describe('useFetch integration', () => {
    it('should pass correct initial data to useFetch', () => {
      const mockUseFetchImplementation = jest.fn().mockReturnValue({
        data: mockMetricsResponse,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });

      // Mock the actual useFetch module
      jest.doMock('@odh-dashboard/internal/utilities/useFetch', () => ({
        __esModule: true,
        default: mockUseFetchImplementation,
      }));

      renderHook(() => useMetricsResourceCount({}));

      expect(mockUseFetchImplementation).toHaveBeenCalledWith(
        expect.any(Function),
        {
          total: undefined,
          perProject: undefined,
          project: undefined,
          counts: undefined,
        },
        { initialPromisePurity: true },
      );
    });

    it('should pass correct options to useFetch', () => {
      const mockUseFetchImplementation = jest.fn().mockReturnValue({
        data: mockMetricsResponse,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });

      jest.doMock('@odh-dashboard/internal/utilities/useFetch', () => ({
        __esModule: true,
        default: mockUseFetchImplementation,
      }));

      renderHook(() => useMetricsResourceCount({}));

      expect(mockUseFetchImplementation).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Object),
        { initialPromisePurity: true },
      );
    });
  });
});
