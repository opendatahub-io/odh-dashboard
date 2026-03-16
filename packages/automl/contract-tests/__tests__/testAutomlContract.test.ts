/**
 * @jest-environment node
 */
/* eslint-disable camelcase */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('AutoML API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load the AutoML OpenAPI schema
  // Note: Path is relative to package root (process.cwd() during test execution),
  // not relative to this test file's directory
  const apiSchema = loadOpenAPISchema('api/openapi/automl.yaml');

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
    // Helper type for secret response data
    type SecretItem = {
      uuid: string;
      name: string;
      type?: string;
      data: Record<string, string>;
      displayName?: string;
      description?: string;
    };

    type SecretsResponseData = {
      data?: SecretItem[];
    };

    // Helper to verify data field in secrets response
    const verifyDataField = (result: Awaited<ReturnType<typeof apiClient.get>>): void => {
      if (result.success) {
        const responseData = result.response.data as SecretsResponseData;
        if (responseData.data && responseData.data.length > 0) {
          expect(responseData.data[0].data).toBeDefined();
          expect(typeof responseData.data[0].data).toBe('object');
          expect(Array.isArray(responseData.data[0].data)).toBe(false);
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

        verifyDataField(result);
      });

      it('should retrieve storage secrets when type=storage', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        verifyDataField(result);
      });
    });

    describe('Optional Fields - displayName and description', () => {
      it('should include displayName when openshift.io/display-name annotation is present', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        // Verify displayName field is properly typed as optional string when present
        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          const annotatedSecret = responseData.data?.find(
            (s) => s.name === 'annotated-display-name-secret',
          );
          expect(annotatedSecret).toBeDefined();
          expect(typeof annotatedSecret?.displayName).toBe('string');
          expect(annotatedSecret?.displayName).toBe('Production S3 Credentials');
        }
      });

      it('should include description when openshift.io/description annotation is present', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        // Verify description field is properly typed as optional string when present
        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          const annotatedSecret = responseData.data?.find(
            (s) => s.name === 'annotated-description-secret',
          );
          expect(annotatedSecret).toBeDefined();
          expect(typeof annotatedSecret?.description).toBe('string');
          expect(annotatedSecret?.description).toBe('AWS credentials for production S3 storage');
        }
      });

      it('should omit displayName and description when annotations are not present', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        // Verify that secrets without annotations don't have these fields
        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          const unannotatedSecret = responseData.data?.find((s) => s.name === 'test-secret');
          expect(unannotatedSecret).toBeDefined();
          expect(unannotatedSecret?.displayName).toBeUndefined();
          expect(unannotatedSecret?.description).toBeUndefined();
        }
      });
    });

    describe('Optional Type Field', () => {
      it('should include type field when secret matches a recognized type or has connection-type annotation', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        // Verify type field is present and valid for storage secrets
        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          if (responseData.data && responseData.data.length > 0) {
            responseData.data.forEach((secret) => {
              if (secret.type !== undefined) {
                expect(typeof secret.type).toBe('string');
                expect(secret.type.length).toBeGreaterThan(0);
              }
            });
          }
        }
      });

      it('should omit type field when secret does not match any recognized type and has no connection-type annotation', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        // The contract should allow secrets without a type field
        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          responseData.data?.forEach((secret) => {
            // Type field is optional - if present, must be a non-empty string
            if (secret.type !== undefined) {
              expect(typeof secret.type).toBe('string');
              expect(secret.type.length).toBeGreaterThan(0);
            }
            // All secrets must have required fields regardless of type
            expect(secret.uuid).toBeDefined();
            expect(secret.name).toBeDefined();
            expect(secret.data).toBeDefined();
          });
        }
      });
    });

    describe('Field Type Validation', () => {
      it('should return secrets with all fields matching schema types', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          responseData.data?.forEach((secret) => {
            // Required fields
            expect(typeof secret.uuid).toBe('string');
            expect(typeof secret.name).toBe('string');
            expect(typeof secret.data).toBe('object');
            expect(Array.isArray(secret.data)).toBe(false);

            // Optional fields - if present, must be correct type
            if (secret.type !== undefined) {
              expect(typeof secret.type).toBe('string');
            }
            if (secret.displayName !== undefined) {
              expect(typeof secret.displayName).toBe('string');
            }
            if (secret.description !== undefined) {
              expect(typeof secret.description).toBe('string');
            }
          });
        }
      });
    });

    describe('Secret Value Sanitization', () => {
      it('should return actual values only for aws_s3_bucket keys', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;
          responseData.data?.forEach((secret) => {
            const keys = Object.keys(secret.data);

            // Check each key-value pair
            keys.forEach((key) => {
              const value = secret.data[key];

              // aws_s3_bucket (case-insensitive) should have actual value
              if (key.toLowerCase() === 'aws_s3_bucket') {
                expect(value).not.toBe('[REDACTED]');
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
              } else {
                // All other keys should be sanitized
                expect(value).toBe('[REDACTED]');
              }
            });
          });
        }
      });

      it('should sanitize all secret values except aws_s3_bucket', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result.success).toBe(true);

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;

          // Count how many secrets have at least one key
          const secretsWithKeys = responseData.data?.filter(
            (secret) => Object.keys(secret.data).length > 0,
          );

          if (secretsWithKeys && secretsWithKeys.length > 0) {
            secretsWithKeys.forEach((secret) => {
              Object.entries(secret.data).forEach(([key, value]) => {
                // Only aws_s3_bucket (case-insensitive) should have actual values
                const isAllowedKey = key.toLowerCase() === 'aws_s3_bucket';

                if (!isAllowedKey) {
                  expect(value).toBe('[REDACTED]');
                }
              });
            });
          }
        }
      });

      it('should handle aws_s3_bucket key with different casing', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result.success).toBe(true);

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;

          responseData.data?.forEach((secret) => {
            Object.entries(secret.data).forEach(([key, value]) => {
              // Check various casings of aws_s3_bucket
              if (['aws_s3_bucket', 'AWS_S3_BUCKET', 'Aws_S3_Bucket'].includes(key)) {
                // Should return actual value, not [REDACTED]
                expect(value).not.toBe('[REDACTED]');
              }
            });
          });
        }
      });

      it('should return data as object, not array', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result.success).toBe(true);

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;

          responseData.data?.forEach((secret) => {
            expect(typeof secret.data).toBe('object');
            expect(Array.isArray(secret.data)).toBe(false);
            expect(secret.data).not.toBeNull();
          });
        }
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

  describe('Pipeline Runs Endpoints', () => {
    describe('List Pipeline Runs', () => {
      it('should retrieve pipeline runs list', async () => {
        const result = await apiClient.get('/api/v1/pipeline-runs?namespace=test-namespace');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should include pipeline_type on every run in the list', async () => {
        const result = await apiClient.get('/api/v1/pipeline-runs?namespace=test-namespace');
        expect(result.success).toBe(true);
        if (result.success) {
          type RunsData = { runs?: Array<{ pipeline_type?: string }> };
          const data = result.response.data as { data: RunsData };
          const runs = data.data.runs ?? [];
          expect(runs.length).toBeGreaterThan(0);
          runs.forEach((run) => {
            expect(['timeseries', 'tabular']).toContain(run.pipeline_type);
          });
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

      it('should include pipeline_type on a single run response', async () => {
        const result = await apiClient.get(
          '/api/v1/pipeline-runs/run-abc123-def456?namespace=test-namespace',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          type RunData = { pipeline_type?: string };
          const data = result.response.data as { data: RunData };
          expect(['timeseries', 'tabular']).toContain(data.data.pipeline_type);
        }
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
          train_data_secret_name: 'minio-secret',
          train_data_bucket_name: 'automl-bucket',
          train_data_file_key: 'data/train.csv',
          label_column: 'target',
          task_type: 'binary',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should include pipeline_type on the created run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs?namespace=test-namespace&pipelineType=timeseries',
          {
            display_name: 'pipeline-type-test-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            label_column: 'target',
            task_type: 'binary',
          },
        );
        expect(result.success).toBe(true);
        if (result.success) {
          type RunData = { pipeline_type?: string };
          const data = result.response.data as { data: RunData };
          expect(data.data.pipeline_type).toBe('timeseries');
        }
      });

      it('should create a pipeline run with all optional fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'full-options-run',
          description: 'Run with all optional fields',
          train_data_secret_name: 'minio-secret',
          train_data_bucket_name: 'automl-bucket',
          train_data_file_key: 'data/train.csv',
          label_column: 'target',
          task_type: 'multiclass',
          top_n: 5,
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

      it('should return 400 for invalid task_type', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'bad-task-type-run',
          train_data_secret_name: 's',
          train_data_bucket_name: 'b',
          train_data_file_key: 'k',
          label_column: 'target',
          task_type: 'unsupervised',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for unknown JSON fields', async () => {
        const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
          display_name: 'test',
          train_data_secret_name: 'minio-secret',
          train_data_bucket_name: 'automl-bucket',
          train_data_file_key: 'data/train.csv',
          label_column: 'target',
          task_type: 'binary',
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
