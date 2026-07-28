/**
 * @jest-environment node
 */
import { apiClient, unauthenticatedClient, expectError } from '../helpers';

describe('Core BFF NIM - XKS Platform', () => {
  describe('NIM Serving Resource', () => {
    it('should return 404 because NIM is OpenShift-only', async () => {
      expectError(await apiClient.get('/api/nim-serving/apiKeySecret'), 404);
    });
  });

  describe('NIM Integration GET', () => {
    it('should return 404 because NIM is OpenShift-only', async () => {
      expectError(await unauthenticatedClient.get('/api/integrations/nim'), 404);
    });
  });

  describe('NIM Integration POST', () => {
    it('should return 404 because NIM is OpenShift-only', async () => {
      // eslint-disable-next-line camelcase
      expectError(await apiClient.post('/api/integrations/nim', { api_key: 'test' }), 404);
    });
  });

  describe('NIM Integration DELETE', () => {
    it('should return 404 because NIM is OpenShift-only', async () => {
      expectError(await apiClient.delete('/api/integrations/nim'), 404);
    });
  });
});
