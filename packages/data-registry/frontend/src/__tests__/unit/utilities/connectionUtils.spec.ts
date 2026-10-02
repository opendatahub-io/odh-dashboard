/* eslint-disable camelcase */
import {
  confirmConnection,
  getConnectionKey,
  toConnectionRef,
} from '~/app/utilities/connectionUtils';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { connectionsResponseSchema } from '~/app/schemas/connection.schema';

describe('connection references', () => {
  it('should distinguish sources even when their identifiers and labels match', () => {
    const dch = mockDchConnection();
    const rhai = mockRhaiConnection({ secret_name: dch.id, name: dch.name });
    expect(getConnectionKey(dch)).not.toBe(getConnectionKey(rhai));
  });

  it('should serialize only stable reference fields', () => {
    expect(toConnectionRef(mockDchConnection())).toEqual({
      type: 'dch',
      id: mockDchConnection().id,
    });
    expect(toConnectionRef(mockRhaiConnection())).toEqual({
      type: 'rhai',
      secret_name: 'my-s3-connection',
    });
  });

  it('should reject a source switch even if the display name matches', async () => {
    const dch = mockDchConnection();
    const refresh = jest.fn().mockResolvedValue([mockRhaiConnection({ name: dch.name })]);
    await expect(confirmConnection(getConnectionKey(dch), refresh)).rejects.toThrow(
      'could not be confirmed',
    );
  });

  it.each([{}, { data: null }, { data: [{}] }, { data: [{ type: 'dch', id: 'name-not-uuid' }] }])(
    'should reject an invalid connection response %j',
    (body) => {
      expect(connectionsResponseSchema.safeParse(body).success).toBe(false);
    },
  );

  it('should accept empty lists and both reference types', () => {
    expect(connectionsResponseSchema.parse({ data: [] }).data).toEqual([]);
    expect(
      connectionsResponseSchema.parse({ data: [mockDchConnection(), mockRhaiConnection()] }).data,
    ).toHaveLength(2);
  });
});
