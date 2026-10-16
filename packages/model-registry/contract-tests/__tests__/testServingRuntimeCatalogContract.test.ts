/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

// The runtime library's Hardware filter reads this catalog field from filter_options and
// sends it back in filterQuery (see RUNTIME_CATALOG_FILTER_FIELDS in the frontend).
const HARDWARE_FIELD = 'capabilities.supportedAccelerators';

describe('Serving runtime catalog endpoints', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });
  const apiSchema = loadOpenAPISchema('upstream/api/openapi/mod-arch.yaml');

  it('returns filter options that include the hardware field the UI reads', async () => {
    const result = await apiClient.get(
      '/api/v1/serving_runtime_catalog/serving_runtimes_filter_options?namespace=kubeflow',
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ServingRuntimeFilterOptionsResponse/content/application/json/schema',
      status: 200,
    });
    expect(result.response?.data).toMatchObject({
      data: { filters: { [HARDWARE_FIELD]: { type: 'string' } } },
    });
  });

  it('accepts the hardware field in filterQuery', async () => {
    const filterQuery = encodeURIComponent(`${HARDWARE_FIELD}='nvidia.com/gpu'`);
    const result = await apiClient.get(
      `/api/v1/serving_runtime_catalog/serving_runtimes?namespace=kubeflow&filterQuery=${filterQuery}`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ServingRuntimeListResponse/content/application/json/schema',
      status: 200,
    });
  });
});
