import { renderHook, waitFor } from '@testing-library/react';
import { useServingRuntimeCatalogAPI } from '~/app/hooks/servingRuntimeCatalog/useServingRuntimeCatalogAPI';
import { useServingRuntime } from '~/app/hooks/servingRuntimeCatalog/useServingRuntime';
import { useServingRuntimeList } from '~/app/hooks/servingRuntimeCatalog/useServingRuntimeList';
import { useServingRuntimeVersions } from '~/app/hooks/servingRuntimeCatalog/useServingRuntimeVersions';
import { useServingRuntimeFilterOptionList } from '~/app/hooks/servingRuntimeCatalog/useServingRuntimeFilterOptionList';

jest.mock('~/app/hooks/servingRuntimeCatalog/useServingRuntimeCatalogAPI');
const api = {
  getServingRuntimeList: jest.fn(),
  getServingRuntime: jest.fn(),
  getServingRuntimeVersions: jest.fn(),
  getServingRuntimeFilterOptionList: jest.fn(),
};
const apiState = { apiAvailable: true, api };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useServingRuntimeCatalogAPI).mockReturnValue(apiState);
});

describe('serving runtime catalog hooks', () => {
  it('should fetch the selected runtime and refetch when its ID changes', async () => {
    api.getServingRuntime.mockImplementation((opts, id) => Promise.resolve({ id }));
    const { result, rerender } = renderHook(({ id }) => useServingRuntime(id), {
      initialProps: { id: '1' },
    });
    await waitFor(() => expect(result.current[0]).toEqual({ id: '1' }));
    expect(result.current[1]).toBe(true);
    rerender({ id: '2' });
    await waitFor(() => expect(result.current[0]).toEqual({ id: '2' }));
  });

  it('should not fetch when the API or runtime ID is unavailable', () => {
    const { rerender } = renderHook(({ id }) => useServingRuntime(id), {
      initialProps: { id: '' },
    });
    expect(api.getServingRuntime).not.toHaveBeenCalled();
    jest.mocked(useServingRuntimeCatalogAPI).mockReturnValue({ ...apiState, apiAvailable: false });
    rerender({ id: '1' });
    expect(api.getServingRuntime).not.toHaveBeenCalled();
  });

  it('should support pagination and stable inline query objects, including empty results', async () => {
    api.getServingRuntimeList.mockResolvedValueOnce({
      items: [{ id: '1' }],
      size: 1,
      pageSize: 1,
      nextPageToken: 'next',
    });
    const { result, rerender } = renderHook(
      ({ token }) =>
        useServingRuntimeList({
          source: ['redhat-runtimes'],
          pageSize: 1,
          nextPageToken: token,
        }),
      { initialProps: { token: '' } },
    );
    await waitFor(() => expect(result.current[1]).toBe(true));
    rerender({ token: '' });
    expect(api.getServingRuntimeList).toHaveBeenCalledTimes(1);
    api.getServingRuntimeList.mockResolvedValue({
      items: [],
      size: 0,
      pageSize: 1,
      nextPageToken: '',
    });
    rerender({ token: 'next' });
    await waitFor(() =>
      expect(api.getServingRuntimeList).toHaveBeenCalledWith(expect.anything(), {
        source: ['redhat-runtimes'],
        pageSize: 1,
        nextPageToken: 'next',
      }),
    );
    await waitFor(() => expect(result.current[0].items).toEqual([]));
  });

  it('should return version request failures to the component', async () => {
    api.getServingRuntimeVersions.mockRejectedValue(new Error('Runtime not found'));
    const { result } = renderHook(() => useServingRuntimeVersions('missing'));
    await waitFor(() => expect(result.current[2]?.message).toBe('Runtime not found'));
  });

  it('should fetch filter options only after the API becomes available', async () => {
    const filters = { filters: { hardware: { type: 'string', values: ['cpu'] } } };
    api.getServingRuntimeFilterOptionList.mockResolvedValue(filters);
    jest.mocked(useServingRuntimeCatalogAPI).mockReturnValue({ ...apiState, apiAvailable: false });
    const { result, rerender } = renderHook(() => useServingRuntimeFilterOptionList());

    expect(api.getServingRuntimeFilterOptionList).not.toHaveBeenCalled();
    expect(result.current[0]).toBeNull();
    expect(result.current[1]).toBe(false);

    jest.mocked(useServingRuntimeCatalogAPI).mockReturnValue(apiState);
    rerender();

    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(api.getServingRuntimeFilterOptionList).toHaveBeenCalledTimes(1);
    expect(result.current[0]).toEqual(filters);
    expect(result.current[2]).toBeUndefined();
  });
});
