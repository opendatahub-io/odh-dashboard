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
  const apiSchema = loadOpenAPISchema(openApiPath);

  it('returns the catalog model list in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/models?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelListResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('returns the catalog source list in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/sources?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogSourceListResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('returns model catalog filter options in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/models/filter_options?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/FilterOptionsResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('returns model catalog labels in the BFF response envelope', async () => {
    const result = await apiClient.get('/api/v1/model_catalog/labels?namespace=kubeflow');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogLabelListResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('returns a catalog model detail in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/sources/sample-source/models/repo1/granite-8b-code-instruct?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('returns catalog model artifacts in the BFF response envelope', async () => {
    const result = await apiClient.get(
      '/api/v1/model_catalog/sources/sample-source/artifacts/repo1/granite-8b-code-instruct?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CatalogModelArtifactListResponse/content/application/json/schema',
      status: 200,
    });
  });
});
