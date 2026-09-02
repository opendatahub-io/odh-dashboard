/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as api from '~/app/api/dataRegistry';
import { useVolume } from '~/app/hooks/useVolume';

jest.mock('~/app/api/dataRegistry');

const mockFetchVolume = jest.mocked(api.fetchVolume);

describe('useVolume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when project is missing', () => {
    const { result } = renderHook(() => useVolume(undefined, 'default', 'my-volume'));
    expect(result.current[0]).toBeNull();
    expect(mockFetchVolume).not.toHaveBeenCalled();
  });

  it('should return null when collection is missing', () => {
    const { result } = renderHook(() => useVolume('my-project', undefined, 'my-volume'));
    expect(result.current[0]).toBeNull();
    expect(mockFetchVolume).not.toHaveBeenCalled();
  });

  it('should return null when name is missing', () => {
    const { result } = renderHook(() => useVolume('my-project', 'default', undefined));
    expect(result.current[0]).toBeNull();
    expect(mockFetchVolume).not.toHaveBeenCalled();
  });

  it('should fetch volume data when all params are provided', async () => {
    const mockVolume = {
      name: 'my-volume',
      'catalog-name': 'my-project',
      'schema-name': 'default',
      'volume-type': 'EXTERNAL',
      'storage-location': 's3://bucket/volumes/my-volume/',
      comment: 'A volume',
      owner: 'user1',
      'created-at': '2026-01-01',
      'updated-at': '2026-01-02',
      properties: {},
    };
    mockFetchVolume.mockResolvedValue(mockVolume);

    const { result } = renderHook(() => useVolume('my-project', 'default', 'my-volume'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[0]).toEqual(mockVolume);
    expect(mockFetchVolume).toHaveBeenCalledWith('my-project', 'default', 'my-volume');
  });

  it('should handle fetch errors', async () => {
    mockFetchVolume.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useVolume('my-project', 'default', 'missing-volume'));

    await waitFor(() => {
      expect(result.current[2]).toBeDefined();
    });

    expect(result.current[2]?.message).toBe('Not found');
    expect(result.current[0]).toBeNull();
  });
});
