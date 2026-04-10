/* eslint-disable camelcase */
/**
 * @jest-environment node
 */
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { IncomingMessage } from 'http';
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
    describe('Success Cases', () => {
      it('should successfully retrieve LSD models list', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/models?namespace=default&secretName=test-lls-secret',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/LSDModelsResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return models with expected data structure', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/models?namespace=default&secretName=test-lls-secret',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          const responseData = result.response.data as {
            data?: { models?: Array<{ id: string; type: string; provider: string }> };
          };
          expect(responseData.data).toBeDefined();
          expect(responseData.data?.models).toBeDefined();
          expect(Array.isArray(responseData.data?.models)).toBe(true);
          if (responseData.data?.models && responseData.data.models.length > 0) {
            const model = responseData.data.models[0];
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('type');
            expect(model).toHaveProperty('provider');
          }
        }
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when namespace query parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/models?secretName=test-lls-secret');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when secretName query parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/models?namespace=default');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when secretName is an invalid DNS-1123 label', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/models?namespace=default&secretName=INVALID_NAME',
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when namespace is an invalid DNS-1123 label', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/models?namespace=INVALID_NS&secretName=test-lls-secret',
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when both query parameters are missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/models');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });
    });
  });

  describe('LSD Vector Store Providers Endpoint', () => {
    describe('Success Cases', () => {
      it('should successfully retrieve LSD vector store providers list', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/vector-stores?namespace=default&secretName=test-lls-secret',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/LSDVectorStoresResponse/content/application/json/schema',
          status: 200,
        });
      });

      it('should return vector store providers with expected data structure', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/vector-stores?namespace=default&secretName=test-lls-secret',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          const responseData = result.response.data as {
            data?: {
              vector_store_providers?: Array<{
                provider_id: string;
                provider_type: string;
              }>;
            };
          };
          expect(responseData.data).toBeDefined();
          expect(responseData.data?.vector_store_providers).toBeDefined();
          expect(Array.isArray(responseData.data?.vector_store_providers)).toBe(true);
          if (
            responseData.data?.vector_store_providers &&
            responseData.data.vector_store_providers.length > 0
          ) {
            const provider = responseData.data.vector_store_providers[0];
            expect(provider).toHaveProperty('provider_id');
            expect(provider).toHaveProperty('provider_type');
          }
        }
      });
    });

    describe('Response Structure', () => {
      it('should return a valid array in vector_store_providers field', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/vector-stores?namespace=default&secretName=test-lls-secret',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          const responseData = result.response.data as {
            data?: { vector_store_providers?: unknown[] };
          };
          expect(responseData.data?.vector_store_providers).toBeDefined();
          expect(Array.isArray(responseData.data?.vector_store_providers)).toBe(true);
        }
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when namespace query parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/vector-stores?secretName=test-lls-secret');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when secretName query parameter is missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/vector-stores?namespace=default');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when secretName is an invalid DNS-1123 label', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/vector-stores?namespace=default&secretName=INVALID_NAME',
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when namespace is an invalid DNS-1123 label', async () => {
        const result = await apiClient.get(
          '/api/v1/lsd/vector-stores?namespace=INVALID_NS&secretName=test-lls-secret',
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });

      it('should return 400 when both query parameters are missing', async () => {
        const result = await apiClient.get('/api/v1/lsd/vector-stores');
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
        expect(result.error?.data).toHaveProperty('error');
      });
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
    const verifyAvailableKeysField = (result: Awaited<ReturnType<typeof apiClient.get>>): void => {
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
      it('should return actual values only for AWS_S3_BUCKET keys', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default&type=storage');
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/SecretsResponse/content/application/json/schema',
          status: 200,
        });

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;

          // Find the secret that has both canonical and non-canonical bucket keys
          const mixedCaseSecret = responseData.data?.find(
            (s) => s.name === 'test-secret-mixed-case-bucket',
          );
          expect(mixedCaseSecret).toBeDefined();

          const mixedCaseData = mixedCaseSecret?.data ?? {};

          // Verify canonical key exists and is NOT redacted
          expect(mixedCaseData).toHaveProperty('AWS_S3_BUCKET');
          expect(mixedCaseData.AWS_S3_BUCKET).not.toBe('[REDACTED]');
          expect(typeof mixedCaseData.AWS_S3_BUCKET).toBe('string');
          expect(mixedCaseData.AWS_S3_BUCKET.length).toBeGreaterThan(0);

          // Verify non-canonical (lowercase) variant exists and IS redacted
          expect(mixedCaseData).toHaveProperty('aws_s3_bucket');
          expect(mixedCaseData.aws_s3_bucket).toBe('[REDACTED]');

          // Also verify all secrets follow the sanitization rule generically
          responseData.data?.forEach((secret) => {
            Object.entries(secret.data).forEach(([key, value]) => {
              if (key === 'AWS_S3_BUCKET') {
                expect(value).not.toBe('[REDACTED]');
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
              } else {
                expect(value).toBe('[REDACTED]');
              }
            });
          });
        }
      });

      it('should sanitize all secret values except AWS_S3_BUCKET', async () => {
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
                // Only AWS_S3_BUCKET (case-sensitive, uppercase) should have actual values
                const isAllowedKey = key === 'AWS_S3_BUCKET';

                if (!isAllowedKey) {
                  expect(value).toBe('[REDACTED]');
                }
              });
            });
          }
        }
      });

      it('should only allow uppercase AWS_S3_BUCKET key', async () => {
        const result = await apiClient.get('/api/v1/secrets?namespace=default');
        expect(result.success).toBe(true);

        if (result.success) {
          const responseData = result.response.data as SecretsResponseData;

          responseData.data?.forEach((secret) => {
            Object.entries(secret.data).forEach(([key, value]) => {
              // Only exact uppercase AWS_S3_BUCKET should return actual value
              if (key === 'AWS_S3_BUCKET') {
                expect(value).not.toBe('[REDACTED]');
              } else {
                // Lowercase or mixed case variants should be redacted
                expect(value).toBe('[REDACTED]');
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

  describe('S3 File Endpoint', () => {
    describe('Success Cases', () => {
      it('should successfully download a file from S3', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=test-file.pdf',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

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
        // Mock S3 should succeed when bucket is provided via secret's AWS_S3_BUCKET field
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should allow bucket query parameter to override secret AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret-with-bucket&bucket=override-bucket&key=file.pdf',
        );
        // Mock S3 validates that query parameter bucket can override secret's AWS_S3_BUCKET
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

    describe('Key Format Variations', () => {
      it('should handle nested key structure', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=folder/subfolder/file.pdf',
        );
        // Mock S3 should return file data for valid key formats
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should handle key with special characters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=my-file_v2.0.pdf',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should handle URL-encoded key', async () => {
        const encodedKey = encodeURIComponent('documents/my file.pdf');
        const result = await apiClient.get(
          `/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=${encodedKey}`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

    describe('Valid Bucket and Key Formats', () => {
      it('should accept simple key format', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=file.pdf',
        );
        // Mock S3 validates parameter parsing and returns mock file data
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should accept key with multiple path segments', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=mybucket&key=documents/2024/file.pdf',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1file/get/responses/200',
          status: 200,
        });
      }, 8000);
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
          llama_stack_vector_io_provider_id: 'vectordb-123',
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
          llama_stack_secret_name: 'llama-secret',
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
          llama_stack_secret_name: 'llama-secret',
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

  describe('S3 File Upload (POST)', () => {
    const buildFormDataWithFile = (): FormData => {
      const form = new FormData();
      form.append(
        'file',
        new Blob(['test content'], { type: 'application/octet-stream' }),
        'file.pdf',
      );
      return form;
    };

    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?secretName=test-secret&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when bucket parameter is missing and secret has no AWS_S3_BUCKET', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when key parameter is missing', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - No File Part', () => {
      it('should return 400 when request body has no file part', async () => {
        const form = new FormData();
        form.append('other', 'value');
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Declared Content-Length', () => {
      /** Matches bff s3_upload_limit.go: 32 MiB file max + 64 MiB multipart envelope. */
      const s3PostMaxDeclaredBodyBytes = (32 << 20) + (64 << 20);

      const postS3WithDeclaredContentLength = async (
        pathWithQuery: string,
        declaredLength: number,
        bodySent: Buffer,
      ): Promise<{ status: number; headers: Record<string, string>; data: unknown }> => {
        const target = new URL(pathWithQuery, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
        const isHttps = target.protocol === 'https:';
        const lib = isHttps ? https : http;
        const port = target.port !== '' ? Number(target.port) : isHttps ? 443 : 80;

        return new Promise((resolve, reject) => {
          const req = lib.request(
            {
              hostname: target.hostname,
              port,
              path: `${target.pathname}${target.search}`,
              method: 'POST',
              headers: {
                'kubeflow-userid': 'dev-user@example.com',
                'kubeflow-groups': 'system:masters',
                'Content-Length': String(declaredLength),
                'Content-Type': 'application/octet-stream',
              },
            },
            (res: IncomingMessage) => {
              const parts: string[] = [];
              res.setEncoding('utf8');
              res.on('data', (chunk: string) => {
                parts.push(chunk);
              });
              res.on('end', () => {
                const raw = parts.join('');
                let data: unknown = raw;
                try {
                  data = raw.length > 0 ? JSON.parse(raw) : undefined;
                } catch {
                  data = raw;
                }
                const headers: Record<string, string> = {};
                for (const [k, v] of Object.entries(res.headers)) {
                  headers[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
                }
                resolve({
                  status: res.statusCode ?? 0,
                  headers,
                  data,
                });
              });
            },
          );
          req.on('error', reject);
          req.write(bodySent);
          req.end();
        });
      };

      it('should return 413 when declared Content-Length exceeds max upload body size', async () => {
        const path =
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=file.pdf';
        const response = await postS3WithDeclaredContentLength(
          path,
          s3PostMaxDeclaredBodyBytes + 1,
          Buffer.from('x'),
        );
        expect(response.status).toBe(413);
        const body = response.data as { error?: { code: string; message: string } };
        expect(body.error).toBeDefined();
        // Shared toMatchContract cannot compile ErrorEnvelope (nested $ref); validate inner Error.
        expect({
          status: response.status,
          data: body.error,
        }).toMatchContract(apiSchema, {
          ref: '#/components/schemas/Error',
          status: 413,
        });
      });
    });

    describe('Error Cases - Secret Issues', () => {
      it('should return 404 when secret does not exist', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&secretName=non-existent-secret&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });
    });

    describe('Valid Request (all params and file present)', () => {
      it('should return 201 with S3UploadSuccess when all parameters and file part are valid', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/file?namespace=default&secretName=test-secret&bucket=my-bucket&key=file.pdf',
          form,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3UploadSuccess',
          status: 201,
        });
      }, 8000);
    });
  });
});
