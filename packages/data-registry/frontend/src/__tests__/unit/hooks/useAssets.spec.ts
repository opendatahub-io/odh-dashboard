/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as api from '~/app/api/dataRegistry';
import { useAssets } from '~/app/hooks/useAssets';

jest.mock('~/app/api/dataRegistry');

const mockFetchCollections = jest.mocked(api.fetchCollections);
const mockFetchAssets = jest.mocked(api.fetchAssets);
const mockFetchVolumes = jest.mocked(api.fetchVolumes);

describe('useAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no project', async () => {
    const { result } = renderHook(() => useAssets(''));
    expect(result.current[0]).toEqual([]);
    expect(result.current[1]).toBe(true);
  });

  it('should fetch and combine tables and volumes', async () => {
    mockFetchCollections.mockResolvedValue({
      namespaces: [['default'], ['analytics']],
    });
    mockFetchAssets.mockResolvedValue({
      assets: [
        {
          name: 'test-table',
          asset_type: 'table',
          format: 'parquet',
          location: 's3://bucket/path',
          description: 'A test table',
          labels: ['production'],
          collection: 'default',
          connection_ref: null,
          owner: 'user1',
          registered_by: 'user1',
          created_at: '2026-01-01',
        },
      ],
    });
    mockFetchVolumes.mockResolvedValue({
      volumes: [
        {
          name: 'test-volume',
          'catalog-name': 'project',
          'schema-name': 'default',
          'volume-type': 'application/pdf',
          'storage-location': 's3://bucket/docs',
          'created-at': '2026-01-01',
          properties: { description: 'PDF docs' },
          config: {},
        },
      ],
    });

    const { result } = renderHook(() => useAssets('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    const assets = result.current[0];
    expect(assets).toHaveLength(4); // 2 collections × (1 table + 1 volume)
    expect(assets.filter((a) => a.assetType === 'table')).toHaveLength(2);
    expect(assets.filter((a) => a.assetType === 'volume')).toHaveLength(2);
    expect(assets[0].name).toBe('test-table');
    expect(assets[0].format).toBe('parquet');
    expect(assets[0].labels).toEqual(['production']);
  });

  it('should handle API errors', async () => {
    mockFetchCollections.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAssets('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[2]).toBeDefined();
    expect(result.current[2]?.message).toBe('Network error');
  });
});
