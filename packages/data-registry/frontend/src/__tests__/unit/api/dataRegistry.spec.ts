/* eslint-disable camelcase */
import { fetchGenericTable } from '~/app/api/dataRegistry';

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
