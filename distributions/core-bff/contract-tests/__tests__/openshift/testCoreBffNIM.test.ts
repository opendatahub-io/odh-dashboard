/**
 * @jest-environment node
 */
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectError,
  expectSuccess,
} from '../helpers';

describe('Core BFF NIM - OpenShift Platform', () => {
  describe('NIM Serving Resource GET', () => {
    it('should return 200 when no auth token is provided', async () => {
      const result = await unauthenticatedClient.get('/api/nim-serving/apiKeySecret');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NIMServingResourceResponse',
        status: 200,
      });
    });

    it('should return 200 for valid resource type', async () => {
      const result = await apiClient.get('/api/nim-serving/apiKeySecret');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NIMServingResourceResponse',
        status: 200,
      });
    });

    it('should return 404 for invalid resource type', async () => {
      expectError(await apiClient.get('/api/nim-serving/invalidType'), 404);
    });
  });

  describe('NIM Integration', () => {
    describe('GET /api/integrations/nim', () => {
      it('should return NIM integration status', async () => {
        const result = await apiClient.get('/api/integrations/nim');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/NIMIntegrationStatus',
          status: 200,
        });
      });

      it('should return 200 when no auth token is provided', async () => {
        const result = await unauthenticatedClient.get('/api/integrations/nim');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/NIMIntegrationStatus',
          status: 200,
        });
      });
    });

    describe('POST /api/integrations/nim', () => {
      it('should return 401 when no auth token is provided', async () => {
        expectError(
          // eslint-disable-next-line camelcase
          await unauthenticatedClient.post('/api/integrations/nim', { api_key: 'test' }),
          401,
        );
      });

      it('should return 403 for non-admin user', async () => {
        // eslint-disable-next-line camelcase
        expectError(await restrictedClient.post('/api/integrations/nim', { api_key: 'test' }), 403);
      });

      it('should return 400 for invalid body', async () => {
        expectError(await apiClient.post('/api/integrations/nim', 'invalid'), 400);
      });

      it('should return 200 with NIMIntegrationStatus schema', async () => {
        // eslint-disable-next-line camelcase
        const result = await apiClient.post('/api/integrations/nim', { api_key: 'test-key' });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/NIMIntegrationStatus',
          status: 200,
        });
      });
    });

    describe('DELETE /api/integrations/nim', () => {
      it('should return 401 when no auth token is provided', async () => {
        expectError(await unauthenticatedClient.delete('/api/integrations/nim'), 401);
      });

      it('should return 403 for non-admin user', async () => {
        expectError(await restrictedClient.delete('/api/integrations/nim'), 403);
      });

      it('should return 200 with NIMDeleteResponse schema', async () => {
        const result = await apiClient.delete('/api/integrations/nim');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/NIMDeleteResponse',
          status: 200,
        });
        const { response } = expectSuccess(result);
        expect((response.data as { success: boolean }).success).toBe(true);
      });
    });
  });
});
