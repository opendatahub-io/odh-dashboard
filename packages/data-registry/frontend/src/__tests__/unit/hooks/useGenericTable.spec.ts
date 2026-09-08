/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as api from '~/app/api/dataRegistry';
import { useGenericTable } from '~/app/hooks/useGenericTable';

jest.mock('~/app/api/dataRegistry');

const mockFetchGenericTable = jest.mocked(api.fetchGenericTable);

describe('useGenericTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when project is missing', () => {
    const { result } = renderHook(() => useGenericTable(undefined, 'default', 'my-table'));
    expect(result.current[0]).toBeNull();
    expect(mockFetchGenericTable).not.toHaveBeenCalled();
  });

  it('should return null when collection is missing', () => {
    const { result } = renderHook(() => useGenericTable('my-project', undefined, 'my-table'));
    expect(result.current[0]).toBeNull();
    expect(mockFetchGenericTable).not.toHaveBeenCalled();
  });

  it('should return null when name is missing', () => {
    const { result } = renderHook(() => useGenericTable('my-project', 'default', undefined));
    expect(result.current[0]).toBeNull();
    expect(mockFetchGenericTable).not.toHaveBeenCalled();
  });

  it('should fetch table data when all params are provided', async () => {
    const mockTable = {
      name: 'my-table',
      asset_type: 'table',
      format: 'parquet',
      location: 's3://bucket/path',
      collection: 'default',
      connection_ref: null,
      owner: 'user1',
      description: 'A table',
      labels: [],
      properties: {},
      registered_by: 'user1',
      created_at: '2026-01-01',
    };
    mockFetchGenericTable.mockResolvedValue(mockTable);

    const { result } = renderHook(() => useGenericTable('my-project', 'default', 'my-table'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[0]).toEqual(mockTable);
    expect(mockFetchGenericTable).toHaveBeenCalledWith('my-project', 'default', 'my-table');
  });

  it('should handle fetch errors', async () => {
    mockFetchGenericTable.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useGenericTable('my-project', 'default', 'missing-table'));

    await waitFor(() => {
      expect(result.current[2]).toBeDefined();
    });

    expect(result.current[2]?.message).toBe('Not found');
    expect(result.current[0]).toBeNull();
  });
});
