/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('AutoRAG API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load the AutoRAG OpenAPI schema
  // Note: Path is relative to package root (process.cwd() during test execution),
  // not relative to this test file's directory
  const apiSchema = loadOpenAPISchema('api/openapi/autorag.yaml');

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result.success).toBe(true);
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application/json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result.success).toBe(true);
    });
  });

  describe('LSD Models Endpoint', () => {
    it('should successfully retrieve LSD models list', async () => {
      const result = await apiClient.get('/api/v1/lsd/models?namespace=default');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/LSDModelsResponse/content/application/json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace query parameter is missing', async () => {
      const result = await apiClient.get('/api/v1/lsd/models');
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
      expect(result.error?.data).toHaveProperty('error');
    });
  });

  describe('Secrets Endpoint', () => {
    // Helper to verify availableKeys field in secrets response
    const verifyAvailableKeysField = (result: Awaited<ReturnType<typeof apiClient.get>>): void => {
      if (result.success) {
        const responseData = result.response.data as {
          data?: Array<{ availableKeys?: unknown }>;
        };
        if (responseData.data && responseData.data.length > 0) {
          expect(responseData.data[0].availableKeys).toBeDefined();
          expect(Array.isArray(responseData.data[0].availableKeys)).toBe(true);
        }
      }
    };

    describe('Success Cases', () => {
      it('should retrieve all secrets when no type filter is specified', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });

      it('should retrieve storage secrets when type=storage', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });

      it('should retrieve lls secrets when type=lls', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=lls');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when resource parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/secrets');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid type parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent namespace', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=non-existent-namespace-12345');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });
  });

  describe('S3 File Endpoint', () => {
    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?secretName=test-secret&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when bucket parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when key parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when all parameters are missing', async () => {
        const result = await apiClient.get('/api/v1/s3/file');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Empty Parameters', () => {
      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=&secretName=test-secret&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty secretName', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty bucket', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty key', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Secret Issues', () => {
      it('should return 404 when secret does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=non-existent-secret&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket&key=file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Key Format Variations', () => {
      it('should handle nested key structure', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=folder/subfolder/file.pdf',
        );
        // Will fail if secret doesn't exist or S3 object doesn't exist, but key format should be valid
        if (!result.success) {
          // Format is valid; if it fails, it should not be a request-validation error
          expect(result.error.status).not.toBe(400);
        }
      });

      it('should handle key with special characters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=my-file_v2.0.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect([404, 500]).toContain(result.error.status);
        }
      });

      it('should handle URL-encoded key', async () => {
        const encodedKey = encodeURIComponent('documents/my file.pdf');
        const result = await apiClient.get(
          `/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=${encodedKey}`,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect([404, 500]).toContain(result.error.status);
        }
      });
    });

    describe('Valid Bucket and Key Formats', () => {
      it('should accept simple key format', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=file.pdf',
        );
        // Will fail without actual S3 setup, but validates parameter parsing
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should not be 400 (bad request) since format is valid
          expect(result.error.status).not.toBe(400);
        }
      });

      it('should accept key with multiple path segments', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=documents/2024/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      });
    });
  });
});
