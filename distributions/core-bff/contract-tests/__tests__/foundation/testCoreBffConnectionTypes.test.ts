/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectSuccess,
  expectError,
} from '../helpers';

describe('Core BFF Connection Types', () => {
  describe('List Endpoint', () => {
    it('should return an array of connection types', async () => {
      const result = await apiClient.get('/api/connection-types');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConnectionTypesResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/connection-types'), 401);
    });

    it('should return connection types for non-admin authenticated user', async () => {
      const { response } = expectSuccess(await restrictedClient.get('/api/connection-types'));
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('By Name', () => {
    it('should return 404 for non-existent connection type', async () => {
      expectError(await apiClient.get('/api/connection-types/nonexistent-ct-12345'), 404);
    });

    it('should return 401 for non-admin on PUT', async () => {
      expectError(
        await restrictedClient.put('/api/connection-types/test', {
          metadata: { name: 'test', labels: {} },
        }),
        401,
      );
    });
  });

  describe('Write Paths', () => {
    const ctName = 'contract-test-ct';

    afterAll(async () => {
      await apiClient.delete(`/api/connection-types/${ctName}`);
    });

    it('should create a connection type with valid labels', async () => {
      const result = await apiClient.post('/api/connection-types', {
        metadata: {
          name: ctName,
          labels: {
            'opendatahub.io/dashboard': 'true',
            'opendatahub.io/connection-type': 'true',
          },
        },
        data: { key: 'value' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/MutationResponse',
        status: 200,
      });
      const { response } = expectSuccess(result);
      expect((response.data as { success: boolean }).success).toBe(true);
    });

    it('should reject create without connection-type labels', async () => {
      const result = await apiClient.post('/api/connection-types', {
        metadata: { name: 'bad-ct', labels: {} },
        data: { key: 'value' },
      });
      const { response } = expectSuccess(result);
      const body = response.data as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('connection-type labels');
    });

    it('should delete a connection type', async () => {
      const result = await apiClient.delete(`/api/connection-types/${ctName}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/MutationResponse',
        status: 200,
      });
    });
  });

  describe('Admin Enforcement', () => {
    it('should return 401 for non-admin on POST', async () => {
      expectError(
        await restrictedClient.post('/api/connection-types', {
          metadata: { name: 'test', labels: {} },
        }),
        401,
      );
    });

    it('should return 401 for non-admin on PATCH', async () => {
      expectError(
        await restrictedClient.patch('/api/connection-types/test', [
          { op: 'replace', path: '/data/key', value: 'val' },
        ]),
        401,
      );
    });

    it('should return 401 for non-admin on DELETE', async () => {
      expectError(await restrictedClient.delete('/api/connection-types/test'), 401);
    });
  });

  describe('Patch Paths', () => {
    const ctName = 'contract-test-ct-patch';

    afterAll(async () => {
      await apiClient.delete(`/api/connection-types/${ctName}`);
    });

    it('should patch a connection type with valid JSON patch', async () => {
      await apiClient.post('/api/connection-types', {
        metadata: {
          name: ctName,
          labels: {
            'opendatahub.io/dashboard': 'true',
            'opendatahub.io/connection-type': 'true',
          },
        },
        data: { key: 'original' },
      });

      const result = await apiClient.patch(`/api/connection-types/${ctName}`, [
        { op: 'replace', path: '/data/key', value: 'patched' },
      ]);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/MutationResponse',
        status: 200,
      });
      const { response } = expectSuccess(result);
      expect((response.data as { success: boolean }).success).toBe(true);
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.patch(`/api/connection-types/${ctName}`, [
          { op: 'replace', path: '/data/key', value: 'val' },
        ]),
        401,
      );
    });
  });
});
