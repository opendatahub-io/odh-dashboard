import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import useMetricsResourceCount from '../useMetricsResourceCount';
import { MetricsCountResponse } from '../../types/metrics';

jest.mock('../../FeatureStoreContext');
const mockUseFeatureStoreAPI = useFeatureStoreAPI as jest.MockedFunction<typeof useFeatureStoreAPI>;

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

        const { result } = renderHook(() => useMetricsResourceCount({}));

        await waitFor(() => {
          expect(result.current.data).toEqual(mockMetricsResponse);
        });
      });
    });

    describe('with project parameter', () => {
      it('should call getMetricsResourceCount with project parameter', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockProjectMetricsResponse);

        renderHook(() => useMetricsResourceCount({ project: 'rbac' }));

        await waitFor(() => {
          expect(mockApi.getMetricsResourceCount).toHaveBeenCalledWith(expect.any(Object), 'rbac');
        });
      });

      it('should return metrics data for specific project', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockProjectMetricsResponse);

        const { result } = renderHook(() => useMetricsResourceCount({ project: 'rbac' }));

        await waitFor(() => {
          expect(result.current.data).toEqual(mockProjectMetricsResponse);
          expect(result.current.loaded).toBe(true);
          expect(result.current.error).toBeUndefined();
        });
      });
    });

    describe('API call behavior', () => {
      it('should handle successful API response', async () => {
        mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);

        const { result } = renderHook(() => useMetricsResourceCount({}));

        await waitFor(() => {
          expect(result.current.data).toEqual(mockMetricsResponse);
          expect(result.current.loaded).toBe(true);
        });
      });

      it('should handle API error', async () => {
        const mockError = new Error('API Error');
        mockApi.getMetricsResourceCount.mockRejectedValue(mockError);

        const { result } = renderHook(() => useMetricsResourceCount({}));

        await waitFor(() => {
          expect(result.current.error).toEqual(mockError);
          expect(result.current.loaded).toBe(false);
        });
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
      mockApi.getMetricsResourceCount.mockResolvedValue(mockProjectMetricsResponse);

      const { rerender } = renderHook(({ project }) => useMetricsResourceCount({ project }), {
        initialProps: { project: 'rbac' },
      });

      rerender({ project: 'credit_scoring_local' });

      expect(mockApi.getMetricsResourceCount).toHaveBeenCalledWith(expect.any(Object), 'rbac');
      expect(mockApi.getMetricsResourceCount).toHaveBeenCalledWith(
        expect.any(Object),
        'credit_scoring_local',
      );
    });

    it('should recreate callback when API changes', () => {
      mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);

      const { rerender } = renderHook(() => useMetricsResourceCount({}));
      const newMockApi = {
        getMetricsResourceCount: jest.fn().mockResolvedValue(mockMetricsResponse),
      };
      mockUseFeatureStoreAPI.mockReturnValue({
        api: newMockApi,
        apiAvailable: true,
      } as unknown as ReturnType<typeof useFeatureStoreAPI>);

      rerender();
      expect(mockApi.getMetricsResourceCount).toHaveBeenCalled();
      expect(newMockApi.getMetricsResourceCount).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty project string', async () => {
      mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);

      const { result } = renderHook(() => useMetricsResourceCount({ project: '' }));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockMetricsResponse);
      });
    });

    it('should handle undefined project', async () => {
      mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);

      const { result } = renderHook(() => useMetricsResourceCount({ project: undefined }));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockMetricsResponse);
      });
    });

    it('should handle null project', async () => {
      mockApi.getMetricsResourceCount.mockResolvedValue(mockMetricsResponse);

      const { result } = renderHook(() =>
        useMetricsResourceCount({ project: null as unknown as string }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockMetricsResponse);
      });
    });
  });
});
