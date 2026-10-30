/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import * as api from '~/app/api/dataRegistry';
import { useAssets } from '~/app/hooks/useAssets';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';

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
    await waitFor(() => expect(result.current[1]).toBe(true));
  });

  it('should fetch and combine tables and volumes', async () => {
    mockFetchCollections.mockResolvedValue({
      namespaces: [['default'], ['analytics']],
    });
    mockFetchAssets.mockResolvedValue({
      assets: [
        mockAssetResponse({
          name: 'test-table',
          description: 'A test table',
          labels: ['production'],
          collection: 'default',
          properties: { domain: 'finance' },
        }),
      ],
    });
    mockFetchVolumes.mockResolvedValue({
      volumes: [
        mockVolumeInfo({
          name: 'test-volume',
          collection: 'default',
          format: 'documents',
          storage_location: 's3://bucket/docs',
          properties: { description: 'PDF docs' },
        }),
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
    expect(assets[0].properties).toEqual({ domain: 'finance' });
    expect(assets[0].rawAsset).toMatchObject({ name: 'test-table' });
  });

  it('should map volume labels from API response', async () => {
    mockFetchCollections.mockResolvedValue({ namespaces: [['col1']] });
    mockFetchAssets.mockResolvedValue({ assets: [] });
    mockFetchVolumes.mockResolvedValue({
      volumes: [
        mockVolumeInfo({
          name: 'labeled-volume',
          collection: 'col1',
          format: 'documents',
          storage_location: '/data',
          labels: ['production', 'ml-data'],
          properties: { description: 'Volume with labels' },
        }),
        mockVolumeInfo({
          name: 'unlabeled-volume',
          collection: 'col1',
          format: 'images',
          storage_location: '/images',
          labels: [],
          properties: {},
        }),
      ],
    });

    const { result } = renderHook(() => useAssets('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    const assets = result.current[0];
    expect(assets).toHaveLength(2);

    const labeled = assets.find((a) => a.name === 'labeled-volume');
    expect(labeled?.labels).toEqual(['production', 'ml-data']);
    expect(labeled?.properties).toEqual({ description: 'Volume with labels' });

    const unlabeled = assets.find((a) => a.name === 'unlabeled-volume');
    expect(unlabeled?.labels).toEqual([]);
  });

  it('should handle API errors', async () => {
    mockFetchCollections.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAssets('test-project'));

    await waitFor(() => expect(result.current[2]).toBeDefined());

    expect(result.current[2]?.message).toBe('Network error');
  });
});
