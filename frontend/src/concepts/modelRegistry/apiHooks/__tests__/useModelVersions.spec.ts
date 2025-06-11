import { renderHook, act } from '@testing-library/react';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';
import useModelVersions from '#~/concepts/modelRegistry/apiHooks/useModelVersions';

jest.mock('#~/concepts/modelRegistry/context/ModelRegistryPageContext');

describe('useModelVersions', () => {
  const mockListModelVersions = jest.fn();
  const mockUseModelRegistryAPI = useModelRegistryAPI as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return initial state when API is not available', async () => {
    mockUseModelRegistryAPI.mockReturnValue({
      api: { listModelVersions: mockListModelVersions },
      apiAvailable: false,
    });

    const { result } = renderHook(() => useModelVersions());

    expect(result.current[0]).toEqual({ items: [], size: 0, pageSize: 0, nextPageToken: '' });
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBeUndefined();

    await act(async () => {
      await result.current[3]();
    });

    expect(mockListModelVersions).not.toHaveBeenCalled();
  });

  it('should fetch model versions when API is available', async () => {
    const mockModelVersions = {
      items: [
        { id: '1', name: 'Model 1' },
        { id: '2', name: 'Model 2' },
      ],
      size: 2,
      pageSize: 10,
      nextPageToken: 'next-token',
    };

    mockUseModelRegistryAPI.mockReturnValue({
      api: { listModelVersions: mockListModelVersions },
      apiAvailable: true,
    });

    mockListModelVersions.mockResolvedValue(mockModelVersions);

    const { result } = renderHook(() => useModelVersions());

    expect(result.current[1]).toBe(false);

    await act(async () => {
      await result.current[3]();
    });

    expect(result.current[0]).toEqual(mockModelVersions);
    expect(result.current[1]).toBe(true);
    expect(result.current[2]).toBeUndefined();
    expect(mockListModelVersions).toHaveBeenCalledTimes(2);
  });

  it('should handle errors when fetching model versions', async () => {
    const mockError = new Error('Failed to fetch model versions');

    mockUseModelRegistryAPI.mockReturnValue({
      api: { listModelVersions: mockListModelVersions },
      apiAvailable: true,
    });

    mockListModelVersions.mockRejectedValue(mockError);

    const { result } = renderHook(() => useModelVersions());

    await act(async () => {
      await result.current[3]();
    });

    expect(result.current[0]).toEqual({ items: [], size: 0, pageSize: 0, nextPageToken: '' });
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBe(mockError);
    expect(mockListModelVersions).toHaveBeenCalledTimes(2);
  });
});
