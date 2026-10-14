/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import {
  deleteGenericTable,
  deleteVolume,
  fetchAssets,
  fetchCollections,
  fetchCollectionDetails,
  fetchGenericTable,
  fetchLabels,
  fetchVolume,
  fetchVolumes,
} from '~/app/api/dataRegistry';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
  restDELETE: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockRestDELETE = jest.mocked(modArchCore.restDELETE);

describe('fetchGenericTable', () => {
  it('should accept null columns for tables without a schema', async () => {
    mockRestGET.mockResolvedValue({
      ...mockAssetResponse({ name: 'schema-less-table' }),
      columns: null,
    });

    await expect(
      fetchGenericTable('test-project', 'default', 'schema-less-table'),
    ).resolves.toMatchObject({
      name: 'schema-less-table',
      columns: null,
    });
  });

  it('should reject unsupported format values in table responses', async () => {
    mockRestGET.mockResolvedValue({
      ...mockAssetResponse({ name: 'external-table' }),
      format: 'external',
    } as never);

    await expect(fetchGenericTable('test-project', 'default', 'external-table')).rejects.toThrow();
  });
});

describe('fetchVolume', () => {
  it('should reject unsupported format values in volume responses', async () => {
    mockRestGET.mockResolvedValue({
      ...mockVolumeInfo({ name: 'pdf-volume' }),
      format: 'pdf',
    } as never);

    await expect(fetchVolume('test-project', 'default', 'pdf-volume')).rejects.toThrow();
  });

  it('should reject non-string volume properties', async () => {
    mockRestGET.mockResolvedValue({
      ...mockVolumeInfo({ name: 'invalid-volume', storage_location: 's3://bucket/documents' }),
      properties: { 'content-type': 123 },
    });

    await expect(fetchVolume('test-project', 'default', 'invalid-volume')).rejects.toThrow();
  });
});

describe('list response validation', () => {
  it('should reject malformed asset list responses', async () => {
    mockRestGET.mockResolvedValue({ assets: 'invalid' } as never);

    await expect(fetchAssets('test-project', 'default')).rejects.toThrow(
      'Data Registry response validation failed for /data-registry/api/v1/test-project/namespaces/default/generic-tables: assets: Invalid input: expected array, received string',
    );
  });

  it('should reject malformed volume list responses', async () => {
    mockRestGET.mockResolvedValue({ volumes: 'invalid' } as never);

    await expect(fetchVolumes('test-project', 'default')).rejects.toThrow(
      'Data Registry response validation failed for /data-registry/api/v1/test-project/namespaces/default/volumes: volumes: Invalid input: expected array, received string',
    );
  });

  it('should reject malformed namespace list responses', async () => {
    mockRestGET.mockResolvedValue({ namespaces: [['default'], [42]] } as never);

    await expect(fetchCollections('test-project')).rejects.toThrow(
      'Data Registry response validation failed for /data-registry/api/v1/test-project/namespaces: namespaces.1.0: Invalid input: expected string, received number',
    );
  });

  it('should reject malformed label list responses', async () => {
    mockRestGET.mockResolvedValue({ labels: [42] } as never);

    await expect(fetchLabels('test-project')).rejects.toThrow(
      'Data Registry response validation failed for /data-registry/api/v1/test-project/labels: labels.0: Invalid input: expected string, received number',
    );
  });
});

describe('fetchCollectionDetails', () => {
  it('should reject malformed namespace details responses', async () => {
    mockRestGET.mockResolvedValue({
      namespace: ['default'],
      properties: { description: 42 },
    } as never);

    await expect(fetchCollectionDetails('test-project', 'default')).rejects.toThrow(
      'Data Registry response validation failed for /data-registry/api/v1/test-project/namespaces/default: properties.description: Invalid input: expected string, received number',
    );
  });
});

describe('data registry delete APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a generic table using the encoded asset path', async () => {
    mockRestDELETE.mockResolvedValue('');

    await deleteGenericTable('project/name', 'collection/name', 'table/name');

    expect(mockRestDELETE).toHaveBeenCalledWith(
      '',
      '/data-registry/api/v1/project%2Fname/namespaces/collection%2Fname/generic-tables/table%2Fname',
      {},
      {},
      { parseJSON: false },
    );
  });

  it('deletes a volume using the encoded asset path', async () => {
    mockRestDELETE.mockResolvedValue('');

    await deleteVolume('project/name', 'collection/name', 'volume/name');

    expect(mockRestDELETE).toHaveBeenCalledWith(
      '',
      '/data-registry/api/v1/project%2Fname/namespaces/collection%2Fname/volumes/volume%2Fname',
      {},
      {},
      { parseJSON: false },
    );
  });

  it('returns the BFF error when deletion fails', async () => {
    mockRestDELETE.mockResolvedValue({
      error: { code: 403, message: 'Access forbidden' },
    });

    await expect(deleteVolume('project', 'collection', 'volume')).rejects.toThrow(
      'status code 403: Access forbidden',
    );
  });
});
