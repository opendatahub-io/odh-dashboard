/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Model Catalog BFF Contract', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });
  const openApiPath = process.env.CONTRACT_OPENAPI_PATH || 'upstream/api/openapi/mod-arch.yaml';
  const apiSchema = loadOpenAPISchema(openApiPath, 'components');
  const namespaceQuery = '?namespace=kubeflow';
  const pagination = {
    items: expect.any(Array),
    size: expect.any(Number),
    pageSize: expect.any(Number),
    nextPageToken: expect.any(String),
  };

  const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.response.data;
  };

  // Needs to assert that the response is wrapped by the BFF in an Envelope
  // and not just a models response
  it('should return the catalog model list in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/models?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]),
        size: expect.any(Number),
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      }),
    });
  });

  it('should return the catalog source list in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/sources?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        ]),
        size: expect.any(Number),
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      }),
    });
  });

  it('should return model catalog filter options in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/models/filter_options?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/FilterOptionsResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({
        filters: expect.any(Object),
        namedQueries: expect.any(Object),
      }),
    });
  });

  it('should return model catalog labels in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/labels?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogLabelListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({
        items: expect.arrayContaining([expect.any(Object)]),
        size: expect.any(Number),
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      }),
    });
  });

  it('should return a catalog model detail in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/sources/sample-source/models/repo1/granite-8b-code-instruct?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({ name: expect.any(String) }),
    });
  });

  it('should return catalog model artifacts in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/sources/sample-source/artifacts/repo1/granite-8b-code-instruct?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelArtifactListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toEqual({
      data: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ uri: expect.any(String) })]),
        size: expect.any(Number),
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      }),
    });
  });

  it('should accept a source filter and pagination token', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/models', {
      params: {
        namespace: 'kubeflow',
        source: 'sample-source',
        pageSize: '1',
        nextPageToken: '1',
      },
    });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        items: expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]),
        size: expect.any(Number),
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      },
    });
  });

  it('should return an empty catalog list for an unmatched search', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/models', {
      params: { namespace: 'kubeflow', q: 'contract-no-matching-model-12345678' },
    });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: { items: [], size: 0, pageSize: expect.any(Number), nextPageToken: expect.any(String) },
    });
  });

  describe('Model catalog metrics', () => {
    it('returns performance metrics for a slash-containing model name', async () => {
      const result = await apiClient.get(
        `/api/v1/model_catalog/sources/sample-source/performance_artifacts/repo1%2Fgranite-8b-code-instruct${namespaceQuery}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CatalogModelArtifactListResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          ...pagination,
          items: expect.arrayContaining([
            expect.objectContaining({
              artifactType: expect.any(String),
              metricsType: expect.any(String),
              customProperties: expect.any(Object),
            }),
          ]),
        },
      });
    });

    it('returns security metric artifacts', async () => {
      const result = await apiClient.get(
        `/api/v1/model_catalog/sources/sample-source/security_artifacts/repo1%2Fgranite-8b-code-instruct${namespaceQuery}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/CatalogModelArtifactListResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          ...pagination,
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              artifactType: expect.any(String),
              metricsType: expect.any(String),
            }),
          ]),
        },
      });
    });
  });

  it('should return a documented error when namespace is missing', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/models');
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
      expect(result.error.data).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
        }),
      );
    }
  });
});
