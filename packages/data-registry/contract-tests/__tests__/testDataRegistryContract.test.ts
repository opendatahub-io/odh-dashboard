/* eslint-disable camelcase */
/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Data Registry BFF Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      Authorization: 'Bearer FAKE_CLUSTER_ADMIN_TOKEN',
    },
  });

  const bffSchema = loadOpenAPISchema('bff/openapi/src/data-registry.yaml');
  const dataRegistryApiSchema = loadOpenAPISchema('bff/openapi/src/data-registry-api.yaml');

  const CONNECTION_ASSETS_PATH = '/api/v1/{project}/connections/{source}/{connection_id}/assets';
  const CONNECTION_ASSETS_RESPONSE_REF =
    'data-registry-api.yaml#/components/schemas/ListConnectionAssetsResponse';
  const UPSTREAM_ERROR_RESPONSE_REF = 'data-registry-api.yaml#/components/schemas/ErrorResponse';

  const asRecord = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;

  const getBffResponseSchema = (responseName: string): Record<string, unknown> => {
    const components = asRecord(bffSchema.components);
    const responses = asRecord(components.responses);
    const response = asRecord(responses[responseName]);
    const content = asRecord(response.content);
    return asRecord(asRecord(content['application/json']).schema);
  };

  const getProxyErrorContract = (responseName: string): Record<string, unknown> => {
    const responseSchema = getBffResponseSchema(responseName);
    const variants = responseSchema.oneOf as Record<string, unknown>[];
    const upstreamSchemas = asRecord(asRecord(dataRegistryApiSchema.components).schemas);

    return {
      ...bffSchema,
      proxyErrorResponse: {
        ...responseSchema,
        oneOf: variants.map((variant) =>
          variant.$ref === UPSTREAM_ERROR_RESPONSE_REF ? upstreamSchemas.ErrorResponse : variant,
        ),
      },
    };
  };

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/HealthCheckResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces list', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/NamespacesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Connection lookup', () => {
    it('should return the active source using the ConnectionRef contract', async () => {
      const result = await apiClient.get<{
        data: { type: string; id?: string; secret_name?: string }[];
      }>('/api/v1/connections/default');
      expect(result).toMatchContract(bffSchema, {
        ref: '#/components/responses/ConnectionsResponse/content/application~1json/schema',
        status: 200,
      });
      if (result.success && process.env.BFF_DCH_SERVICE_NAME) {
        expect(result.data.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: 'dch', id: '550e8400-e29b-41d4-a716-446655440000' }),
          ]),
        );
      }
    });

    it('should reject an invalid project namespace', async () => {
      const result = await apiClient.get('/api/v1/connections/Invalid_Project');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect({ status: result.error.status, data: result.error.data }).toMatchContract(
          bffSchema,
          {
            ref: '#/components/responses/BadRequest/content/application~1json/schema',
            status: 400,
          },
        );
      }
    });
  });

  describe('Connection asset lookup contract', () => {
    const responseContract = { ref: '#/components/schemas/ListConnectionAssetsResponse' };

    it('should publish the upstream response schema and proxy error responses', () => {
      expect(bffSchema).toMatchObject({
        paths: {
          [CONNECTION_ASSETS_PATH]: {
            get: {
              operationId: 'proxyListConnectionAssets',
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: { $ref: CONNECTION_ASSETS_RESPONSE_REF },
                    },
                  },
                },
                '400': { $ref: '#/components/responses/ProxyBadRequest' },
                '401': { $ref: '#/components/responses/ProxyUnauthorized' },
              },
            },
          },
        },
        components: {
          responses: {
            ProxyBadRequest: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: UPSTREAM_ERROR_RESPONSE_REF },
                      { $ref: '#/components/schemas/BffErrorEnvelope' },
                    ],
                  },
                },
              },
            },
            ProxyUnauthorized: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: UPSTREAM_ERROR_RESPONSE_REF },
                      { $ref: '#/components/schemas/BffErrorEnvelope' },
                    ],
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should accept a mixed table and volume response', () => {
      expect({
        assets: [
          {
            name: 'claims',
            asset_type: 'table',
            uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            format: 'parquet',
            collection: 'underwriting',
            owner: 'data-team',
            created_at: '2026-11-16T10:30:00Z',
            updated_at: '2026-11-16T10:30:00Z',
          },
          {
            name: 'source-documents',
            asset_type: 'volume',
            uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
            format: 'documents',
            collection: 'archive',
            owner: 'data-team',
            created_at: '2026-11-16T10:35:00Z',
            updated_at: '2026-11-16T10:35:00Z',
          },
        ],
      }).toMatchContract(dataRegistryApiSchema, responseContract);
    });

    it('should accept an empty assets response', () => {
      expect({ assets: [] }).toMatchContract(dataRegistryApiSchema, responseContract);
    });

    it.each([
      [
        'an unsupported asset type',
        {
          assets: [
            {
              name: 'unknown',
              asset_type: 'dataset',
              uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              format: 'parquet',
              collection: 'archive',
              owner: 'data-team',
              created_at: '2026-11-16T10:30:00Z',
              updated_at: '2026-11-16T10:30:00Z',
            },
          ],
        },
      ],
      [
        'an asset missing required fields',
        { assets: [{ name: 'incomplete', asset_type: 'table' }] },
      ],
    ])('should reject %s', (_description, response) => {
      expect(response).not.toMatchContract(dataRegistryApiSchema, responseContract);
    });

    it.each([
      ['400', 'ProxyBadRequest', 400, 'BadRequestException'],
      ['401', 'ProxyUnauthorized', 401, 'UnauthorizedException'],
    ])(
      'should accept an upstream-shaped %s error against the proxy response schema',
      (_status, responseName, code, type) => {
        expect({
          error: {
            message: 'Request rejected by Data Registry',
            type,
            code,
          },
        }).toMatchContract(getProxyErrorContract(responseName), { ref: '#/proxyErrorResponse' });
      },
    );

    it.each([
      ['400', 'ProxyBadRequest', '400'],
      ['401', 'ProxyUnauthorized', '401'],
    ])(
      'should accept a BFF-generated %s error against the proxy response schema',
      (_status, responseName, code) => {
        expect({
          error: {
            code,
            message: 'Request rejected by the BFF',
          },
        }).toMatchContract(getProxyErrorContract(responseName), { ref: '#/proxyErrorResponse' });
      },
    );
  });

  describe('Data Registry Proxy Routes - Upstream Unavailable', () => {
    it('should return 503 for get config when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/config');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list collections when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list tables when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces/test-collection/tables');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for get table when upstream is unavailable', async () => {
      const result = await apiClient.get(
        '/api/v1/test-project/namespaces/test-collection/tables/test-table',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for create table when upstream is unavailable', async () => {
      const result = await apiClient.post(
        '/api/v1/test-project/namespaces/test-collection/tables',
        {
          name: 'new-table',
          schema: {
            type: 'struct',
            fields: [{ id: 1, name: 'col1', type: 'string', required: true }],
          },
        },
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for delete table when upstream is unavailable', async () => {
      const result = await apiClient.delete(
        '/api/v1/test-project/namespaces/test-collection/tables/test-table',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for list volumes when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/namespaces/test-collection/volumes');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for search when upstream is unavailable', async () => {
      const result = await apiClient.get('/api/v1/test-project/search?query=sales');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });

    it('should return 503 for connection asset lookup when upstream is unavailable', async () => {
      const result = await apiClient.get(
        '/api/v1/test-project/connections/dch/550e8400-e29b-41d4-a716-446655440000/assets',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(503);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/ServiceUnavailable/content/application~1json/schema',
          status: 503,
        });
      }
    });
  });

  describe('Authentication Error Handling', () => {
    const unauthenticatedClient = new ContractApiClient({
      baseUrl,
    });

    it('should return 400 for user endpoint without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/user');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 for namespaces endpoint without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/namespaces');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });

    it('should return 400 for proxy routes without auth headers', async () => {
      const result = await unauthenticatedClient.get('/api/v1/test-project/search?query=sales');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(400);
        expect({
          status: result.error.status,
          data: result.error.data,
        }).toMatchContract(bffSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
      }
    });
  });
});
