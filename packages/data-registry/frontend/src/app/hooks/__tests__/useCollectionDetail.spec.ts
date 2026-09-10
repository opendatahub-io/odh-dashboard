/* eslint-disable camelcase */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCollectionDetail } from '~/app/hooks/useCollectionDetail';
import * as dataRegistryApi from '~/app/api/dataRegistry';

jest.mock('~/app/api/dataRegistry');
jest.mock('~/app/utilities/collectionUtils', () => ({
  parseCollectionDescription: (
    properties: Record<string, string>,
    project: string,
    collection: string,
  ) => {
    const nsKey = `_ns_${project}_${collection}`;
    if (properties[nsKey]) {
      try {
        return JSON.parse(properties[nsKey]).description || '';
      } catch {
        return properties.description || '';
      }
    }
    return properties.description || '';
  },
}));

const mockFetchCollectionDetails = jest.mocked(dataRegistryApi.fetchCollectionDetails);
const mockFetchAssets = jest.mocked(dataRegistryApi.fetchAssets);
const mockFetchVolumes = jest.mocked(dataRegistryApi.fetchVolumes);

describe('useCollectionDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when project or collection is undefined', () => {
    const { result } = renderHook(() => useCollectionDetail(undefined, undefined));

    expect(result.current[0]).toBeNull();
    expect(result.current[1]).toBe(true);
    expect(result.current[2]).toBeUndefined();
  });

  it('should fetch and return collection detail with assets', async () => {
    mockFetchCollectionDetails.mockResolvedValue({
      namespace: ['default'],
      properties: {
        '_ns_demo-user-1_default': '{"description": "Test collection"}',
        owner: 'test-owner',
        created_at: '2026-01-01T00:00:00Z',
        created_by: 'test-user',
      },
    });

    mockFetchAssets.mockResolvedValue({
      assets: [
        {
          name: 'table1',
          asset_type: 'table',
          format: 'iceberg',
          collection: 'default',
        },
        {
          name: 'table2',
          asset_type: 'table',
          format: 'delta',
          collection: 'default',
        },
      ],
    });

    mockFetchVolumes.mockResolvedValue({
      volumes: [
        {
          name: 'volume1',
          'catalog-name': 'demo-user-1',
          'schema-name': 'default',
          'volume-type': 'external',
          'storage-location': 's3://bucket/path',
        },
      ],
    });

    const { result } = renderHook(() => useCollectionDetail('demo-user-1', 'default'));

    await waitFor(() => expect(result.current[1]).toBe(true));

    const [detail, loaded, error] = result.current;

    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
    expect(detail).toEqual({
      name: 'default',
      description: 'Test collection',
      owner: 'test-owner',
      createdAt: '2026-01-01T00:00:00Z',
      createdBy: 'test-user',
      structuredCount: 2,
      unstructuredCount: 1,
      assets: [
        { name: 'table1', assetType: 'table', format: 'iceberg' },
        { name: 'table2', assetType: 'table', format: 'delta' },
        { name: 'volume1', assetType: 'volume', format: 'external' },
      ],
    });
  });

  it('should parse collection-specific description from properties', async () => {
    mockFetchCollectionDetails.mockResolvedValue({
      namespace: ['sample'],
      properties: {
        '_ns_demo-user-1_sample': '{"description": "Sample collection description"}',
        description: 'RHAI Data Registry', // Generic description should be ignored
        owner: 'system:admin',
        created_at: '',
        created_by: '',
      },
    });

    mockFetchAssets.mockResolvedValue({ assets: [] });
    mockFetchVolumes.mockResolvedValue({ volumes: [] });

    const { result } = renderHook(() => useCollectionDetail('demo-user-1', 'sample'));

    await waitFor(() => expect(result.current[1]).toBe(true));

    const [detail] = result.current;
    expect(detail?.description).toBe('Sample collection description');
  });

  it('should fall back to generic description if collection-specific property is missing', async () => {
    mockFetchCollectionDetails.mockResolvedValue({
      namespace: ['old-collection'],
      properties: {
        description: 'Generic description',
        owner: 'system:admin',
        created_at: '',
        created_by: '',
      },
    });

    mockFetchAssets.mockResolvedValue({ assets: [] });
    mockFetchVolumes.mockResolvedValue({ volumes: [] });

    const { result } = renderHook(() => useCollectionDetail('demo-user-1', 'old-collection'));

    await waitFor(() => expect(result.current[1]).toBe(true));

    const [detail] = result.current;
    expect(detail?.description).toBe('Generic description');
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    mockFetchCollectionDetails.mockRejectedValue(error);

    const { result } = renderHook(() => useCollectionDetail('demo-user-1', 'default'));

    await waitFor(() => expect(result.current[1]).toBe(true));

    const [detail, loaded, apiError] = result.current;
    expect(loaded).toBe(true);
    expect(detail).toBeNull();
    expect(apiError).toBe(error);
  });

  it('should refresh data when refresh function is called', async () => {
    mockFetchCollectionDetails.mockResolvedValue({
      namespace: ['default'],
      properties: {
        '_ns_demo-user-1_default': '{"description": "Initial"}',
        owner: 'test-owner',
        created_at: '',
        created_by: '',
      },
    });

    mockFetchAssets.mockResolvedValue({ assets: [] });
    mockFetchVolumes.mockResolvedValue({ volumes: [] });

    const { result } = renderHook(() => useCollectionDetail('demo-user-1', 'default'));

    await waitFor(() => expect(result.current[1]).toBe(true));

    // Update mock data
    mockFetchCollectionDetails.mockResolvedValue({
      namespace: ['default'],
      properties: {
        '_ns_demo-user-1_default': '{"description": "Updated"}',
        owner: 'test-owner',
        created_at: '',
        created_by: '',
      },
    });

    // Call refresh
    act(() => {
      result.current[3]();
    });

    await waitFor(() => {
      expect(result.current[0]?.description).toBe('Updated');
    });
  });
});
