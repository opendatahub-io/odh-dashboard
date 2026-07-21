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

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.get('/api/connection-types/nonexistent-ct-12345'),
        401,
      );
    });

    it('should return 404 for non-existent connection type as non-admin', async () => {
      expectError(await restrictedClient.get('/api/connection-types/nonexistent-ct-12345'), 404);
    });

    it('should return 403 for non-admin on PUT', async () => {
      expectError(
        await restrictedClient.put('/api/connection-types/test', {
          metadata: { name: 'test', labels: {} },
        }),
        403,
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
    it('should return 403 for non-admin on POST', async () => {
      expectError(
        await restrictedClient.post('/api/connection-types', {
          metadata: { name: 'test', labels: {} },
        }),
        403,
      );
    });

    it('should return 403 for non-admin on PATCH', async () => {
      expectError(
        await restrictedClient.patch('/api/connection-types/test', [
          { op: 'replace', path: '/data/key', value: 'val' },
        ]),
        403,
      );
    });

    it('should return 403 for non-admin on DELETE', async () => {
      expectError(await restrictedClient.delete('/api/connection-types/test'), 403);
    });

    it('should return 401 for unauthenticated on POST', async () => {
      expectError(
        await unauthenticatedClient.post('/api/connection-types', {
          metadata: { name: 'test', labels: {} },
        }),
        401,
      );
    });

    it('should return 401 for unauthenticated on PUT', async () => {
      expectError(
        await unauthenticatedClient.put('/api/connection-types/test', {
          metadata: { name: 'test', labels: {} },
        }),
        401,
      );
    });

    it('should return 401 for unauthenticated on DELETE', async () => {
      expectError(await unauthenticatedClient.delete('/api/connection-types/test'), 401);
    });
  });

  describe('Connection Test Endpoint', () => {
    it('should return mock success for S3 connection test', async () => {
      const result = await apiClient.post('/api/v1/connections/test', {
        connectionType: 's3',
        fieldValues: {
          AWS_S3_ENDPOINT: 'http://minio:9000',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_ACCESS_KEY_ID: 'key',
          AWS_SECRET_ACCESS_KEY: 'secret',
        },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConnectionTestResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const data = response.data as { data: { success: boolean; message: string } };
      expect(data.data.success).toBe(true);
      expect(data.data.message).toContain('test-bucket');
    });

    it('should return mock success for URI connection test', async () => {
      const result = await apiClient.post('/api/v1/connections/test', {
        connectionType: 'uri',
        fieldValues: { URI: 'https://example.com/data' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConnectionTestResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const data = response.data as { data: { success: boolean; message: string } };
      expect(data.data.success).toBe(true);
    });

    it('should return mock success for OCI connection test', async () => {
      const result = await apiClient.post('/api/v1/connections/test', {
        connectionType: 'oci',
        fieldValues: { OCI_HOST: 'quay.io' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConnectionTestResponse/content/application/json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const data = response.data as { data: { success: boolean; message: string } };
      expect(data.data.success).toBe(true);
    });

    it('should return 400 for unsupported connection type', async () => {
      const { data } = expectError(
        await apiClient.post('/api/v1/connections/test', {
          connectionType: 'unknown-type',
          fieldValues: {},
        }),
        400,
      );
      expect((data as { error: { code: string } }).error.code).toBe('UNSUPPORTED_TYPE');
    });

    it('should return 400 for empty connectionType', async () => {
      const { data } = expectError(
        await apiClient.post('/api/v1/connections/test', {
          connectionType: '',
          fieldValues: {},
        }),
        400,
      );
      expect((data as { error: { code: string } }).error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for null fieldValues', async () => {
      const { data } = expectError(
        await apiClient.post('/api/v1/connections/test', {
          connectionType: 's3',
          fieldValues: null,
        }),
        400,
      );
      expect((data as { error: { code: string } }).error.code).toBe('INVALID_REQUEST');
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(
        await unauthenticatedClient.post('/api/v1/connections/test', {
          connectionType: 's3',
          fieldValues: {},
        }),
        401,
      );
    });

    it('should allow non-admin users to test connections', async () => {
      const result = await restrictedClient.post('/api/v1/connections/test', {
        connectionType: 's3',
        fieldValues: {
          AWS_S3_ENDPOINT: 'http://minio:9000',
          AWS_S3_BUCKET: 'test',
          AWS_ACCESS_KEY_ID: 'key',
          AWS_SECRET_ACCESS_KEY: 'secret',
        },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConnectionTestResponse/content/application/json/schema',
        status: 200,
      });
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
