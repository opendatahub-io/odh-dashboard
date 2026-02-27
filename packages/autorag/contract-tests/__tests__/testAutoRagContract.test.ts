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

  describe('Secrets Endpoint', () => {
    describe('Success Cases', () => {
      it('should retrieve all secrets when no type filter is specified', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve storage secrets when type=storage', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve lls secrets when type=lls', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=lls');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle lls type filter with pagination', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&type=lls&limit=5');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });
    });

    describe('Pagination', () => {
      it('should handle pagination with limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=10');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle pagination with offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=5');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle pagination with both limit and offset', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=5&offset=2');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 400 for limit=0', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=0');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return default limit of 10 when no limit specified', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
        // Verify the default limit is actually applied
        if (result.success) {
          const responseData = result.response.data as { data: unknown[] };
          expect(Array.isArray(responseData.data)).toBe(true);
          expect(responseData.data.length).toBeLessThanOrEqual(10);
        }
      });

      it('should handle limit=100 (maximum allowed)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=100');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should handle offset beyond available data', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=99999');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });
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

      it('should return 400 for invalid limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for negative limit parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=-1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for negative offset parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&offset=-1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for limit exceeding maximum (101)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=101');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for limit exceeding maximum (999)', async () => {
        const result = await apiClient.get('/api/v1/secrets?resource=default&limit=999');
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
          '/api/v1/s3/file?secretName=test-secret&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when path parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret',
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

    describe('Error Cases - Invalid Path Format', () => {
      it('should return 400 for path without bucket (no slash)', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=invalid-path-no-slash',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for path with empty bucket', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for path with empty key', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=bucket/',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for path with only slash', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=/',
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
          '/api/v1/s3/file?namespace=default&secretName=non-existent-secret&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=non-existent-namespace&secretName=test-secret&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Error Cases - Empty Parameters', () => {
      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=&secretName=test-secret&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty secretName', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=&path=bucket/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty path', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Path Format Variations', () => {
      it('should handle nested path structure', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=bucket/folder/subfolder/file.pdf',
        );
        // Will fail if secret doesn't exist or S3 object doesn't exist, but path format should be valid
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should be 404 (not found) not 400 (bad request) since path format is valid
          expect([404, 500]).toContain(result.error.status);
        }
      });

      it('should handle path with special characters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=bucket/my-file_v2.0.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect([404, 500]).toContain(result.error.status);
        }
      });

      it('should handle URL-encoded path', async () => {
        const encodedPath = encodeURIComponent('bucket/documents/my file.pdf');
        const result = await apiClient.get(
          `/api/v1/s3/file?namespace=default&secretName=test-secret&path=${encodedPath}`,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect([404, 500]).toContain(result.error.status);
        }
      });
    });

    describe('Valid Path Formats', () => {
      it('should accept simple bucket/key format', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=mybucket/file.pdf',
        );
        // Will fail without actual S3 setup, but validates path parsing
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should not be 400 (bad request) since format is valid
          expect(result.error.status).not.toBe(400);
        }
      });

      it('should accept bucket with multiple path segments', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&path=mybucket/documents/2024/file.pdf',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      });
    });
  });
});
