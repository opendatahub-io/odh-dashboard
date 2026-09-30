/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import {
  deleteGenericTable,
  deleteVolume,
  fetchGenericTable,
  fetchVolume,
} from '~/app/api/dataRegistry';

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
      name: 'schema-less-table',
      asset_type: 'table',
      columns: null,
    });

    await expect(
      fetchGenericTable('test-project', 'default', 'schema-less-table'),
    ).resolves.toMatchObject({
      name: 'schema-less-table',
      columns: null,
    });
  });
});

describe('fetchVolume', () => {
  it('should reject non-string volume properties', async () => {
    mockRestGET.mockResolvedValue({
      name: 'invalid-volume',
      'catalog-name': 'test-project',
      'schema-name': 'default',
      'volume-type': 'documents',
      'storage-location': 's3://bucket/documents',
      properties: { 'content-type': 123 },
    });

    await expect(fetchVolume('test-project', 'default', 'invalid-volume')).rejects.toThrow();
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
