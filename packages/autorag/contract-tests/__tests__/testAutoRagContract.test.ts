/* eslint-disable camelcase */
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
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });

      it('should retrieve storage secrets when type=storage', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });

      it('should retrieve lls secrets when type=lls', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=lls');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyAvailableKeysField(result);
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/secrets');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid type parameter', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/secrets?namespace=non-existent-namespace-12345',
        );
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

      it('should return 400 when bucket parameter is missing and secret has no AWS_S3_BUCKET', async () => {
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

    describe('Bucket Parameter Fallback', () => {
      it('should accept request without bucket query parameter when secret has AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret-with-bucket&key=file.pdf',
        );
        // Should not return 400 since bucket is provided via secret
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);

      it('should allow bucket query parameter to override secret AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret-with-bucket&bucket=override-bucket&key=file.pdf',
        );
        // Should not return 400 since both bucket sources are valid
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);
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
      }, 8000);

      it('should handle key with special characters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=my-file_v2.0.pdf',
        );
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);

      it('should handle URL-encoded key', async () => {
        const encodedKey = encodeURIComponent('documents/my file.pdf');
        const result = await apiClient.get(
          `/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=${encodedKey}`,
        );
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);
    });

    describe('Valid Bucket and Key Formats', () => {
      it('should accept simple key format', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=file.pdf',
        );
        // Will fail without actual S3 setup, but validates parameter parsing
        if (!result.success) {
          // Should not be 400 (bad request) since format is valid
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);

      it('should accept key with multiple path segments', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=documents/2024/file.pdf',
        );
        if (!result.success) {
          expect(result.error.status).not.toBe(400);
        }
      }, 8000);
    });
  });

  describe('Pipeline Runs Endpoints', () => {
    describe('List Pipeline Runs', () => {
      it('should retrieve pipeline runs list', async () => {
        const result = await apiClient.get('/api/v1/pipeline-runs?namespace=test-namespace');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should support filtering by pipeline version ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs?namespace=test-namespace&pipelineVersionId=22e57c06-030f-4c63-900d-0a808d577899',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should support pagination parameters', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs?namespace=test-namespace&pageSize=10',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });
    });

    describe('Get Single Pipeline Run', () => {
      it('should retrieve a single pipeline run by ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs/run-abc123-def456?namespace=test-namespace',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs/non-existent-run-id?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Create Pipeline Run', () => {
      it('should create a pipeline run with required fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'contract-test-run',
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          llama_stack_secret_name: 'llama-secret',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should create a pipeline run with all optional fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'full-options-run',
          description: 'Run with all optional fields',
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          llama_stack_secret_name: 'llama-secret',
          optimization_metric: 'answer_correctness',
          embeddings_models: ['model-a', 'model-b'],
          generation_models: ['gen-model-1'],
          llama_stack_vector_database_id: 'vectordb-123',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return 400 for missing required fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'incomplete-run',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for invalid optimization metric', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'bad-metric-run',
          test_data_secret_name: 's',
          test_data_bucket_name: 'b',
          test_data_key: 'k',
          input_data_secret_name: 's',
          input_data_bucket_name: 'b',
          input_data_key: 'k',
          llama_stack_secret_name: 's',
          optimization_metric: 'invalid_metric',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for unknown JSON fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'test',
          unknown_field: 'should be rejected',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });
  });
});
