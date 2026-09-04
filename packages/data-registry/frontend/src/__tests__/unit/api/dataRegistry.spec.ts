import { deleteGenericTable, deleteVolume } from '~/app/api/dataRegistry';

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
