/* eslint-disable camelcase */
/**
 * @jest-environment node
 */
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { IncomingMessage } from 'http';
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

  describe('Model Registries Endpoint', () => {
    it('should return 200 with model registries list', async () => {
      const result = await apiClient.get('/api/v1/model-registries');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/ModelRegistriesResponse/content/application/json/schema',
          status: 200,
        });
      }
    });

    it('should return data with model_registries array', async () => {
      const result = await apiClient.get('/api/v1/model-registries');
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as { data: { model_registries: unknown[] } };
        expect(envelope.data).toHaveProperty('model_registries');
        expect(Array.isArray(envelope.data.model_registries)).toBe(true);
      }
    });

    it('should return registries with required fields', async () => {
      const result = await apiClient.get('/api/v1/model-registries');
      expect(result.success).toBe(true);
      if (result.success) {
        const envelope = result.response.data as {
          data: {
            model_registries: { id: string; name: string; is_ready: boolean; server_url: string }[];
          };
        };
        const registries = envelope.data.model_registries;
        expect(registries.length).toBeGreaterThan(0);
        const first = registries[0];
        expect(typeof first.id).toBe('string');
        expect(typeof first.name).toBe('string');
        expect(typeof first.is_ready).toBe('boolean');
        expect(first.server_url).toContain('/api/model_registry/v1alpha3');
      }
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
      it('should return actual values only for AWS_S3_BUCKET keys', async () => {
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

              // AWS_S3_BUCKET (case-sensitive, uppercase) should have actual value
              if (key === 'AWS_S3_BUCKET') {
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

          // Find the fixture secret that has lowercase and mixed-case variants
          const caseVariantSecret = responseData.data?.find(
            (s) => s.name === 'case-variant-bucket-secret',
          );
          expect(caseVariantSecret).toBeDefined();

          const caseVariantData = caseVariantSecret?.data ?? {};

          // Uppercase AWS_S3_BUCKET should have its actual value
          expect(caseVariantData.AWS_S3_BUCKET).not.toBe('[REDACTED]');
          expect(caseVariantData.AWS_S3_BUCKET).toBe('correct-bucket');

          // Lowercase variant should be redacted
          expect(caseVariantData.aws_s3_bucket).toBe('[REDACTED]');

          // Mixed-case variant should be redacted
          expect(caseVariantData.Aws_S3_Bucket).toBe('[REDACTED]');

          // Also verify the general rule across all secrets
          responseData.data?.forEach((secret) => {
            Object.entries(secret.data).forEach(([key, value]) => {
              if (key === 'AWS_S3_BUCKET') {
                expect(value).not.toBe('[REDACTED]');
              } else {
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
          '/api/v1/s3/files/test-file.pdf?namespace=default&secretName=test-secret&bucket=my-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when bucket parameter is missing and secret has no AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=test-secret',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Empty Parameters', () => {
      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty secretName', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty bucket', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=test-secret&bucket=',
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
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=non-existent-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket',
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
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=test-secret-with-bucket',
        );
        // Mock S3 should succeed when bucket is provided via secret's AWS_S3_BUCKET field
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should allow bucket query parameter to override secret AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=test-secret-with-bucket&bucket=override-bucket',
        );
        // Mock S3 validates that query parameter bucket can override secret's AWS_S3_BUCKET
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

    describe('Key Format Variations', () => {
      it('should handle nested key structure', async () => {
        const result = await apiClient.get(
          `/api/v1/s3/files/${encodeURIComponent(
            'folder/subfolder/file.pdf',
          )}?namespace=default&secretName=test-secret&bucket=my-bucket`,
        );
        // Mock S3 should return file data for valid key formats
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should handle key with special characters', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/my-file_v2.0.pdf?namespace=default&secretName=test-secret&bucket=my-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should handle URL-encoded key', async () => {
        const encodedKey = encodeURIComponent('documents/my file.pdf');
        const result = await apiClient.get(
          `/api/v1/s3/files/${encodedKey}?namespace=default&secretName=test-secret&bucket=my-bucket`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);
    });

    describe('Valid Bucket and Key Formats', () => {
      it('should accept simple key format', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/file.pdf?namespace=default&secretName=test-secret&bucket=mybucket',
        );
        // Mock S3 validates parameter parsing and returns mock file data
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);

      it('should accept key with multiple path segments', async () => {
        const result = await apiClient.get(
          `/api/v1/s3/files/${encodeURIComponent(
            'documents/2024/file.pdf',
          )}?namespace=default&secretName=test-secret&bucket=mybucket`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/paths/~1api~1v1~1s3~1files~1{key}/get/responses/200',
          status: 200,
        });
      }, 8000);
    });
  });

  describe('S3 File Upload (POST)', () => {
    const buildFormDataWithFile = (): FormData => {
      const form = new FormData();
      form.append('file', new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' }), 'file.csv');
      return form;
    };

    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const form = buildFormDataWithFile();
        const result = await apiClient.postFormData(
          '/api/v1/s3/files/file.csv?secretName=test-secret&bucket=my-bucket',
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
          '/api/v1/s3/files/file.csv?namespace=default&bucket=my-bucket',
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
          '/api/v1/s3/files/file.csv?namespace=default&secretName=test-secret',
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
          '/api/v1/s3/files/file.csv?namespace=default&secretName=test-secret&bucket=my-bucket',
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
          '/api/v1/s3/files/file.csv?namespace=default&secretName=test-secret&bucket=my-bucket';
        const response = await postS3WithDeclaredContentLength(
          path,
          s3PostMaxDeclaredBodyBytes + 1,
          Buffer.from('x'),
        );
        expect(response.status).toBe(413);
        const body = response.data as { error?: { code: string; message: string } };
        expect(body.error).toBeDefined();
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
          '/api/v1/s3/files/file.csv?namespace=default&secretName=non-existent-secret&bucket=my-bucket',
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
          '/api/v1/s3/files/file.csv?namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket',
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
          '/api/v1/s3/files/file.csv?namespace=default&secretName=test-secret&bucket=my-bucket',
          form,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3UploadSuccess',
          status: 201,
        });
      }, 8000);
    });
  });

  describe('S3 File Schema Endpoint', () => {
    describe('Success Cases', () => {
      it('should successfully retrieve CSV file schema from S3', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=test-secret&bucket=my-bucket',
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3FileSchemaResponse',
          status: 200,
        });
      }, 8000);
    });

    describe('Error Cases - Missing Parameters', () => {
      it('should return 400 when namespace parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when secretName parameter is missing', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when bucket parameter is missing and secret has no AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=test-secret',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Empty Parameters', () => {
      it('should return 400 for empty namespace', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty secretName', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });
    });

    describe('Error Cases - Secret and File Issues', () => {
      it('should return 404 when secret does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=non-existent-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 404 when namespace does not exist', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=non-existent-namespace&secretName=test-secret&bucket=my-bucket',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should handle request for non-existent CSV file', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/non-existent.csv?view=schema&namespace=default&secretName=test-secret&bucket=my-bucket',
        );
        // Mock S3 returns 404 for files with "non-existent" in the key
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      }, 8000);
    });

    describe('Bucket Parameter Fallback', () => {
      it('should accept request without bucket query parameter when secret has AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=test-secret-with-bucket',
        );
        // Mock S3 should return schema when bucket is provided via secret's AWS_S3_BUCKET field
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3FileSchemaResponse',
          status: 200,
        });
      }, 8000);

      it('should allow bucket query parameter to override secret AWS_S3_BUCKET', async () => {
        const result = await apiClient.get(
          '/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=test-secret-with-bucket&bucket=override-bucket',
        );
        // Mock S3 validates that query parameter bucket can override secret's AWS_S3_BUCKET
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3FileSchemaResponse',
          status: 200,
        });
      }, 8000);
    });

    describe('File Format Validation', () => {
      it('should handle CSV files with nested paths', async () => {
        const result = await apiClient.get(
          `/api/v1/s3/files/${encodeURIComponent(
            'folder/subfolder/data.csv',
          )}?view=schema&namespace=default&secretName=test-secret&bucket=my-bucket`,
        );
        // Mock S3 returns schema data for valid CSV key formats
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3FileSchemaResponse',
          status: 200,
        });
      }, 8000);

      it('should handle URL-encoded file keys', async () => {
        const encodedKey = encodeURIComponent('data/my file.csv');
        const result = await apiClient.get(
          `/api/v1/s3/files/${encodedKey}?view=schema&namespace=default&secretName=test-secret&bucket=my-bucket`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/S3FileSchemaResponse',
          status: 200,
        });
      }, 8000);
    });
  });

  describe('Register Model Endpoint (POST /model-registries/:registryId/models)', () => {
    const mockRegistryId = 'a1b2c3d4-e5f6-7890-abcd-111111111111';
    const unknownRegistryId = '00000000-0000-0000-0000-000000000000';

    // Note: Success case (201) cannot be tested in contract tests because the mock BFF
    // resolves to a real Model Registry URL (ExternalURL) that doesn't exist in the test
    // environment. The 201 response shape is validated by handler unit tests instead.

    describe('Error Cases', () => {
      it('should return 404 when registryId does not match any registry', async () => {
        const result = await apiClient.post(
          `/api/v1/model-registries/${unknownRegistryId}/models?namespace=default`,
          {
            s3_path: 'path/model.bin',
            model_name: 'test-model',
            version_name: 'v1',
          },
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(404);
        }
      });

      it('should return 400 for missing required fields', async () => {
        const result = await apiClient.post(
          `/api/v1/model-registries/${mockRegistryId}/models?namespace=default`,
          {
            model_name: 'test-model',
            // Missing s3_path, version_name
          },
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 for empty S3 path', async () => {
        const result = await apiClient.post(
          `/api/v1/model-registries/${mockRegistryId}/models?namespace=default`,
          {
            s3_path: '',
            model_name: 'test-model',
            version_name: 'v1',
          },
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 400 when namespace is missing', async () => {
        const result = await apiClient.post(`/api/v1/model-registries/${mockRegistryId}/models`, {
          s3_path: 'path/model.bin',
          model_name: 'test-model',
          version_name: 'v1',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
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
      describe('Tabular Pipeline', () => {
        it('should create a tabular pipeline run with required fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'contract-test-tabular-run',
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

        it('should include pipeline_type on the created tabular run', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'pipeline-type-tabular-test-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            label_column: 'target',
            task_type: 'binary',
          });
          expect(result.success).toBe(true);
          if (result.success) {
            type RunData = { pipeline_type?: string };
            const data = result.response.data as { data: RunData };
            expect(data.data.pipeline_type).toBe('tabular');
          }
        });

        it('should create a tabular pipeline run with all optional fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'full-options-tabular-run',
            description: 'Tabular run with all optional fields',
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

        it('should create a tabular regression pipeline run', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'regression-test-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            label_column: 'price',
            task_type: 'regression',
          });
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
            status: 200,
          });
        });

        it('should return 400 for missing required tabular fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'incomplete-tabular-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            // Missing label_column and task_type
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
      });

      describe('Timeseries Pipeline', () => {
        it('should create a timeseries pipeline run with required fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'contract-test-timeseries-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            task_type: 'timeseries',
            target: 'sales',
            id_column: 'store_id',
            timestamp_column: 'date',
          });
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
            status: 200,
          });
        });

        it('should include pipeline_type on the created timeseries run', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'pipeline-type-timeseries-test-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            task_type: 'timeseries',
            target: 'sales',
            id_column: 'store_id',
            timestamp_column: 'date',
          });
          expect(result.success).toBe(true);
          if (result.success) {
            type RunData = { pipeline_type?: string };
            const data = result.response.data as { data: RunData };
            expect(data.data.pipeline_type).toBe('timeseries');
          }
        });

        it('should create a timeseries pipeline run with all optional fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'full-options-timeseries-run',
            description: 'Timeseries run with all optional fields',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            task_type: 'timeseries',
            target: 'sales',
            id_column: 'store_id',
            timestamp_column: 'date',
            prediction_length: 7,
            known_covariates_names: ['temperature', 'is_holiday'],
            top_n: 5,
          });
          expect(result).toMatchContract(apiSchema, {
            ref: '#/components/responses/CreatePipelineRunResponse/content/application/json/schema',
            status: 200,
          });
        });

        it('should return 400 for missing required timeseries fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'incomplete-timeseries-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            task_type: 'timeseries',
            target: 'sales',
            // Missing id_column and timestamp_column
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });

      describe('display_name Length Validation', () => {
        it('display_name 250 chars accepted', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'a'.repeat(250),
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

        it('display_name 251 chars rejected', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'a'.repeat(251),
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            label_column: 'target',
            task_type: 'binary',
          });
          expect(result.success).toBe(false);
          expect(result.error?.status).toBe(400);
          expect(result.error?.data).toHaveProperty('error');
        });
      });

      describe('General Validation', () => {
        it('should return 400 for missing common required fields', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'incomplete-run',
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

        it('should return 400 when task_type is missing', async () => {
          const result = await apiClient.post('/api/v1/pipeline-runs?namespace=test-namespace', {
            display_name: 'missing-task-type-run',
            train_data_secret_name: 'minio-secret',
            train_data_bucket_name: 'automl-bucket',
            train_data_file_key: 'data/train.csv',
            target: 'sales',
            id_column: 'store_id',
            timestamp_column: 'date',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.status).toBe(400);
          }
        });
      });
    });

    describe('Terminate Pipeline Run', () => {
      it('should terminate an active pipeline run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-ghi789-jkl012/terminate?namespace=test-namespace',
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when attempting to terminate a non-terminatable (SUCCEEDED) run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-abc123-def456/terminate?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/non-existent-run-id/terminate?namespace=test-namespace',
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
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when attempting to retry a non-retryable (SUCCEEDED) run', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/run-abc123-def456/retry?namespace=test-namespace',
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.status).toBe(400);
        }
      });

      it('should return 404 for non-existent run ID', async () => {
        const result = await apiClient.post(
          '/api/v1/pipeline-runs/non-existent-run-id/retry?namespace=test-namespace',
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
});
