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

  const apiSchema = loadOpenAPISchema('api/openapi/autorag.yaml');

  const NS = 'my-project';
  const NS_NO_DSPA = 'no-dspa';
  const SECRET = 'data-connection';
  const OGX_SECRET = 'ogx';
  const BUCKET = 's3-bucket';

  const SUCCEEDED_RUN = 'e78c5f2a-5726-4e1c-bcb6-60434e77e453';

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });
  });

  describe('OGX Models Endpoint', () => {
    it('should retrieve OGX models list', async () => {
      const result = await apiClient.get(
        `/api/v1/ogx/models?namespace=${NS}&secretName=${OGX_SECRET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/OGXModelsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/ogx/models?secretName=${OGX_SECRET}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 400 when secretName parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/ogx/models?namespace=${NS}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('OGX Vector Store Providers Endpoint', () => {
    it('should retrieve vector store providers list', async () => {
      const result = await apiClient.get(
        `/api/v1/ogx/vector-stores?namespace=${NS}&secretName=${OGX_SECRET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/OGXVectorStoresResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/ogx/vector-stores?secretName=${OGX_SECRET}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 400 when secretName parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/ogx/vector-stores?namespace=${NS}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('Secrets Endpoint', () => {
    it('should retrieve all secrets', async () => {
      const result = await apiClient.get(`/api/v1/secrets?namespace=${NS}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should retrieve storage secrets when type=storage', async () => {
      const result = await apiClient.get(`/api/v1/secrets?namespace=${NS}&type=storage`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should retrieve ogx secrets when type=ogx', async () => {
      const result = await apiClient.get(`/api/v1/secrets?namespace=${NS}&type=ogx`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get('/api/v1/secrets');
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('Secret Data Endpoint', () => {
    it('should retrieve a single secret with base64-encoded values', async () => {
      const result = await apiClient.get(`/api/v1/secret/${SECRET}?namespace=${NS}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretDataResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/secret/${SECRET}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('S3 File Download Endpoint', () => {
    const SEED_FILE =
      'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json';

    it('should successfully download a file', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(SEED_FILE)}?namespace=${NS}&secretName=${SECRET}`,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });

    it('should download via DSPA mode when secretName is omitted', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(SEED_FILE)}?namespace=${NS}`,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(SEED_FILE)}?secretName=${SECRET}&bucket=${BUCKET}`,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 404 when namespace has no DSPA and secretName is omitted', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(SEED_FILE)}?namespace=${NS_NO_DSPA}`,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(404);
    });
  });

  describe('S3 Files Endpoint', () => {
    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/s3/files?namespace=default&bucket=my-bucket');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when bucket parameter is missing and secret has no AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when all parameters are missing', async () => {
        const result = await apiClient.get('/api/v1/s3/files');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });
    describe('Error Cases - Empty Parameters', () => {
      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty secret_name', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty bucket when secret has no AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret&bucket=',
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
          '/api/v1/s3/files?namespace=default&secretName=non-existent-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket',
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
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      }, 8000);

      it('should allow bucket query parameter to override secret AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&bucket=override-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      }, 8000);
    });
    describe('Search parameters handling', () => {
      const searchParamsUri =
        '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket';

      describe('path parameter', () => {
        it('should accept request with valid path parameter', async () => {
          const result = await apiClient.get(`${searchParamsUri}&path=folder/subfolder`);
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
            status: 200,
          });
        }, 8000);

        it('should return 400 when path is provided but empty', async () => {
          const result = await apiClient.get(`${searchParamsUri}&path=`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });

      describe('search parameter', () => {
        it('should accept request with valid search parameter', async () => {
          const result = await apiClient.get(`${searchParamsUri}&search=myfile`);
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
            status: 200,
          });
        }, 8000);

        it('should return 400 when search contains slash characters', async () => {
          const result = await apiClient.get(`${searchParamsUri}&search=folder/file`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });

      describe('next parameter', () => {
        it('should accept request with valid next parameter', async () => {
          const result = await apiClient.get(`${searchParamsUri}&next=some-continuation-token`);
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
            status: 200,
          });
        }, 8000);

        it('should return 400 when next is provided but empty', async () => {
          const result = await apiClient.get(`${searchParamsUri}&next=`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });

      describe('limit parameter', () => {
        it('should accept request with valid limit parameter', async () => {
          const result = await apiClient.get(`${searchParamsUri}&limit=20`);
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
            status: 200,
          });
        }, 8000);

        it('should return 400 when limit is zero', async () => {
          const result = await apiClient.get(`${searchParamsUri}&limit=0`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });

        it('should return 400 when limit is negative', async () => {
          const result = await apiClient.get(`${searchParamsUri}&limit=-1`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });

        it('should return 400 when limit exceeds 1000', async () => {
          const result = await apiClient.get(`${searchParamsUri}&limit=1001`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });

        it('should return 400 when limit is not a number', async () => {
          const result = await apiClient.get(`${searchParamsUri}&limit=abc`);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });
    });

    describe('Success Cases', () => {
      it('should retrieve files list with bucket from secret', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve files list with explicit bucket parameter', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&bucket=my-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return response with expected S3 list objects structure', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
        expect(result.success).toBe(true);
      });

      it('should retrieve files with path parameter', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&path=folder/subfolder',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve files with search parameter', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&search=myfile',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve files with limit parameter', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&limit=10',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve files with next (continuation token) parameter', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&next=some-token',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should retrieve files with combined path, search, and limit parameters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files?namespace=default&secretName=test-secret-with-bucket&path=documents&search=report&limit=5',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/S3GetFilesResponse/content/application/json/schema',
          status: 200,
        });
      });
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
        // This UUID is the deterministic LatestVersionID derived for "test-namespace" by
        // psmocks.DeriveMockIDs("test-namespace") — computed as SHA-256("version-latest:test-namespace").
        // Update here if the derivation logic in client_mock.go changes.
        const latestVersionId = '12ca9d3a-b625-533c-1987-52e3dd8f409e';
        const result = await apiClient.get(
          `/api/v1/pipeline-runs?namespace=test-namespace&pipelineVersionId=${latestVersionId}`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
        // Verify every returned run belongs to the requested pipeline version
        if (result.success) {
          type RunData = {
            data?: {
              runs?: Array<{
                pipeline_version_reference?: { pipeline_version_id?: string };
              }>;
            };
          };
          const responseData = result.response.data as RunData;
          const runs = responseData.data?.runs ?? [];
          expect(runs.length).toBeGreaterThan(0);
          for (const run of runs) {
            expect(run.pipeline_version_reference?.pipeline_version_id).toBe(latestVersionId);
          }
        }
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
          ogx_secret_name: 'ogx-secret',
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
          ogx_secret_name: 'ogx-secret',
          optimization_metric: 'answer_correctness',
          embedding_models: ['model-a', 'model-b'],
          generation_models: ['gen-model-1'],
          vector_io_provider_id: 'vectordb-123',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('display_name 250 chars accepted', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'a'.repeat(250),
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          ogx_secret_name: 'ogx-secret',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('display_name 251 chars rejected', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'a'.repeat(251),
          test_data_secret_name: 'minio-secret',
          test_data_bucket_name: 'autorag',
          test_data_key: 'test_data.json',
          input_data_secret_name: 'minio-secret',
          input_data_bucket_name: 'autorag',
          input_data_key: 'documents/',
          ogx_secret_name: 'ogx-secret',
        });
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
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
          ogx_secret_name: 's',
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

    describe('Terminate Pipeline Run', () => {
      it('should terminate an active pipeline run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-ghi789-jkl012/terminate?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when attempting to terminate a non-terminatable (SUCCEEDED) run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-abc123-def456/terminate?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/non-existent-run-id/terminate?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Retry Pipeline Run', () => {
      it('should retry a failed pipeline run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-mno345-pqr678/retry?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when attempting to retry a non-retryable (SUCCEEDED) run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-abc123-def456/retry?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/non-existent-run-id/retry?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Delete Pipeline Run', () => {
      it('should delete a succeeded pipeline run', async () => {
        const result = await apiClient.delete(
          '/api/v1/pipeline-runs/run-abc123-def456?namespace=test-namespace',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should delete a failed pipeline run', async () => {
        const result = await apiClient.delete(
          '/api/v1/pipeline-runs/run-mno345-pqr678?namespace=test-namespace',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when attempting to delete an active (RUNNING) run', async () => {
        const result = await apiClient.delete(
          '/api/v1/pipeline-runs/run-ghi789-jkl012?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
          expect({
            status: result.error.status,
            data: result.error.data,
          }).toMatchContract(apiSchema, {
            ref: '#/components/responses/BadRequest/content/application~1json/schema',
            status: 400,
          });
        }
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.delete(
          '/api/v1/pipeline-runs/non-existent-run-id?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
          expect({
            status: result.error.status,
            data: result.error.data,
          }).toMatchContract(apiSchema, {
            ref: '#/components/responses/NotFound/content/application~1json/schema',
            status: 404,
          });
        }
      });
    });
  });

  describe('Enable Managed Pipelines Endpoint', () => {
    describe('Success Cases', () => {
      it('should return 200 when enabling managed pipelines on a namespace with a DSPA', async () => {
        const result = await apiClient.post(
          '/api/v1/managed-pipelines/enable?namespace=test-namespace',
          undefined,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/EnableManagedPipelinesResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return response with expected data structure', async () => {
        const result = await apiClient.post(
          '/api/v1/managed-pipelines/enable?namespace=test-namespace',
          undefined,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          const responseData = result.response.data as { message?: string; dspa?: string };
          expect(responseData.message).toBeDefined();
          expect(responseData.dspa).toBeDefined();
          expect(typeof responseData.message).toBe('string');
          expect(typeof responseData.dspa).toBe('string');
        }
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when namespace query parameter is missing', async () => {
        const result = await apiClient.post('/api/v1/managed-pipelines/enable', undefined);
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 404 when no DSPA exists in namespace', async () => {
        const result = await apiClient.post(
          '/api/v1/managed-pipelines/enable?namespace=no-dspas-namespace',
          undefined,
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(404);
      });
    });
  });

  describe('S3 File Upload Endpoint', () => {
    const buildFormDataWithFile = (): FormData => {
      const form = new FormData();
      form.append(
        'file',
        new Blob(['test content'], { type: 'application/octet-stream' }),
        'file.pdf',
      );
      return form;
    };

    it('should return 201 on successful upload', async () => {
      const form = buildFormDataWithFile();
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.pdf?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/S3UploadSuccess',
        status: 201,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const form = buildFormDataWithFile();
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.pdf?secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 400 when request body has no file part', async () => {
      const form = new FormData();
      form.append('other', 'value');
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.pdf?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('S3 Files List Endpoint', () => {
    it('should list files from S3', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/S3GetFilesResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should list files via DSPA mode', async () => {
      const result = await apiClient.get(`/api/v1/s3/files?namespace=${NS}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/S3GetFilesResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/s3/files?secretName=${SECRET}&bucket=${BUCKET}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('Pipeline Runs Endpoints', () => {
    describe('List Pipeline Runs', () => {
      it('should retrieve pipeline runs list', async () => {
        const result = await apiClient.get(`/api/v1/pipeline-runs?namespace=${NS}`);
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should support pagination parameters', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs?namespace=${NS}&pageSize=10&page=1`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should return 404 when namespace has no DSPA', async () => {
        const result = await apiClient.get(`/api/v1/pipeline-runs?namespace=${NS_NO_DSPA}`);
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(404);
      });
    });

    describe('Get Single Pipeline Run', () => {
      it('should retrieve a single pipeline run by ID', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}?namespace=${NS}`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs/non-existent-run-id?namespace=${NS}`,
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Create Pipeline Run', () => {
      it('should create a pipeline run with required fields', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'contract-test-run',
          test_data_secret_name: SECRET,
          test_data_bucket_name: BUCKET,
          test_data_key:
            'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json',
          input_data_secret_name: SECRET,
          input_data_bucket_name: BUCKET,
          input_data_key: 'autorag input data/pdf/bank_policies_pdf/documents',
          ogx_secret_name: OGX_SECRET,
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should create a pipeline run with all optional fields', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'full-options-run',
          description: 'Run with all optional fields',
          test_data_secret_name: SECRET,
          test_data_bucket_name: BUCKET,
          test_data_key:
            'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json',
          input_data_secret_name: SECRET,
          input_data_bucket_name: BUCKET,
          input_data_key: 'autorag input data/pdf/bank_policies_pdf/documents',
          ogx_secret_name: OGX_SECRET,
          optimization_metric: 'answer_correctness',
          embedding_models: ['vllm-embedding/ibm-granite/granite-embedding-english-r2'],
          generation_models: ['vllm-inference/meta-llama/Llama-3.1-8B-Instruct'],
          vector_io_provider_id: 'milvus',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should return 400 for missing required fields', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'incomplete-run',
        });
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should return 400 for invalid optimization metric', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'bad-metric-run',
          test_data_secret_name: SECRET,
          test_data_bucket_name: BUCKET,
          test_data_key:
            'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json',
          input_data_secret_name: SECRET,
          input_data_bucket_name: BUCKET,
          input_data_key: 'autorag input data/pdf/bank_policies_pdf/documents',
          ogx_secret_name: OGX_SECRET,
          optimization_metric: 'invalid_metric',
        });
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });
    });

    describe('Terminate Pipeline Run', () => {
      let createdRunId: string;

      it('should create a run to terminate', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'terminate-target',
          test_data_secret_name: SECRET,
          test_data_bucket_name: BUCKET,
          test_data_key:
            'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json',
          input_data_secret_name: SECRET,
          input_data_bucket_name: BUCKET,
          input_data_key: 'autorag input data/pdf/bank_policies_pdf/documents',
          ogx_secret_name: OGX_SECRET,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          type RunEnvelope = { data: { run_id: string } };
          createdRunId = (result.response.data as RunEnvelope).data.run_id;
          expect(createdRunId).toBeDefined();
        }
      });

      it('should terminate the newly created (PENDING) run', async () => {
        expect(createdRunId).toBeDefined();
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${createdRunId}/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when terminating a SUCCEEDED run', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/non-existent-run-id/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Retry Pipeline Run', () => {
      let failedRunId: string;

      it('should create and terminate a run to produce a FAILED state', async () => {
        const createResult = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'retry-target',
          test_data_secret_name: SECRET,
          test_data_bucket_name: BUCKET,
          test_data_key:
            'autorag input data/pdf/bank_policies_pdf/all_bank_policies_eval_data_pdf.json',
          input_data_secret_name: SECRET,
          input_data_bucket_name: BUCKET,
          input_data_key: 'autorag input data/pdf/bank_policies_pdf/documents',
          ogx_secret_name: OGX_SECRET,
        });
        expect(createResult.success).toBe(true);
        if (createResult.success) {
          type RunEnvelope = { data: { run_id: string } };
          failedRunId = (createResult.response.data as RunEnvelope).data.run_id;
        }
        const terminateResult = await apiClient.post(
          `/api/v1/pipeline-runs/${failedRunId}/terminate?namespace=${NS}`,
          {},
        );
        expect(terminateResult.success).toBe(true);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 3000);
        });
      });

      it('should retry the FAILED run', async () => {
        expect(failedRunId).toBeDefined();
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${failedRunId}/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when retrying a SUCCEEDED run', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/non-existent-run-id/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Delete Pipeline Run', () => {
      it('should delete a SUCCEEDED run', async () => {
        const result = await apiClient.delete(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}?namespace=${NS}`,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.delete(
          `/api/v1/pipeline-runs/non-existent-run-id?namespace=${NS}`,
        );
        expect(result.success).toBe(false);
      });
    });
  });
});
