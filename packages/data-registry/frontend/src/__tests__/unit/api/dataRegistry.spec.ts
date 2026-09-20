/* eslint-disable camelcase */
import {
  deleteGenericTable,
  deleteVolume,
  fetchGenericTable,
  fetchVolume,
} from '~/app/api/dataRegistry';

describe('fetchGenericTable', () => {
  it('should accept null columns for tables without a schema', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'schema-less-table',
        asset_type: 'table',
        columns: null,
      }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
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
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'invalid-volume',
        'catalog-name': 'test-project',
        'schema-name': 'default',
        'volume-type': 'documents',
        'storage-location': 's3://bucket/documents',
        properties: { 'content-type': 123 },
      }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    await expect(fetchVolume('test-project', 'default', 'invalid-volume')).rejects.toThrow();
  });
});

const response = (ok: boolean, body = '', status = 204) => ({
  ok,
  status,
  text: async () => body,
});

describe('data registry delete APIs', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes a generic table using the encoded asset path', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(true));
    Object.defineProperty(global, 'fetch', { value: fetchMock, configurable: true });

    await deleteGenericTable('project/name', 'collection/name', 'table/name');

    expect(fetchMock).toHaveBeenCalledWith(
      '/data-registry/api/v1/project%2Fname/namespaces/collection%2Fname/generic-tables/table%2Fname',
      { method: 'DELETE', headers: undefined, body: undefined },
    );
  });

  it('deletes a volume using the encoded asset path', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(true));
    Object.defineProperty(global, 'fetch', { value: fetchMock, configurable: true });

    await deleteVolume('project/name', 'collection/name', 'volume/name');

    expect(fetchMock).toHaveBeenCalledWith(
      '/data-registry/api/v1/project%2Fname/namespaces/collection%2Fname/volumes/volume%2Fname',
      { method: 'DELETE', headers: undefined, body: undefined },
    );
  });

  it('returns the BFF error when deletion fails', async () => {
    Object.defineProperty(global, 'fetch', {
      value: jest.fn().mockResolvedValue(response(false, 'forbidden', 403)),
      configurable: true,
    });

    await expect(deleteVolume('project', 'collection', 'volume')).rejects.toThrow(
      'API error 403: forbidden',
    );
  });
});
