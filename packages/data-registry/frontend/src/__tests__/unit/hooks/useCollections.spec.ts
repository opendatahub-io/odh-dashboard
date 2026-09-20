import { renderHook, waitFor } from '@testing-library/react';
import * as api from '~/app/api/dataRegistry';
import { useCollections } from '~/app/hooks/useCollections';
import { RegistryAsset } from '~/app/hooks/useAssets';

jest.mock('~/app/api/dataRegistry');

const mockFetchCollectionDetails = jest.mocked(api.fetchCollectionDetails);

const mockAssets: RegistryAsset[] = [
  {
    name: 'table1',
    description: '',
    format: 'parquet',
    assetType: 'table',
    location: '',
    connectionRef: '',
    labels: [],
    collection: 'analytics',
  },
  {
    name: 'volume1',
    description: '',
    format: 'application/pdf',
    assetType: 'volume',
    location: '',
    connectionRef: '',
    labels: [],
    collection: 'analytics',
  },
  {
    name: 'table2',
    description: '',
    format: 'iceberg',
    assetType: 'table',
    location: '',
    connectionRef: '',
    labels: [],
    collection: 'default',
  },
];

describe('useCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no project', async () => {
    const { result } = renderHook(() => useCollections('', [], []));
    expect(result.current[0]).toEqual([]);
    expect(result.current[1]).toBe(true);
  });

  it('should fetch collection details and derive counts from assets', async () => {
    mockFetchCollectionDetails
      .mockResolvedValueOnce({
        namespace: ['analytics'],
        properties: { description: 'Analytics data' },
      })
      .mockResolvedValueOnce({
        namespace: ['default'],
        properties: { description: 'Default collection' },
      });

    const { result } = renderHook(() =>
      useCollections('test-project', mockAssets, ['analytics', 'default']),
    );

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    const collections = result.current[0];
    expect(collections).toHaveLength(2);

    expect(collections[0].name).toBe('analytics');
    expect(collections[0].description).toBe('Analytics data');
    expect(collections[0].tableCount).toBe(1);
    expect(collections[0].volumeCount).toBe(1);
    expect(collections[0].assetNames).toEqual(['table1', 'volume1']);

    expect(collections[1].name).toBe('default');
    expect(collections[1].tableCount).toBe(1);
    expect(collections[1].volumeCount).toBe(0);
  });
});
