/* eslint-env jest */
import { ContractApiClient } from '@odh-dashboard/contract-tests';

describe('Model Registry List Endpoint', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  const path = require('path');
  const fs = require('fs');
  const yaml = require('js-yaml');
  const openApiPath = path.resolve(process.cwd(), 'upstream/api/openapi/mod-arch.yaml');
  const openApiDoc = yaml.load(fs.readFileSync(openApiPath, 'utf8')) as Record<string, unknown>;
  const apiSchema = openApiDoc;

  it('should successfully retrieve model registries list', async () => {
    const result = await apiClient.get('/api/v1/model_registry?namespace=default', 'list-default');
    // Expect-style contract matcher, aligned with PR style
    expect({ status: result.status, data: result.data }).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryRespone/content/application/json/schema',
      expectedStatus: 200,
    });
  });

  it('should handle empty registry list', async () => {
    const result = await apiClient.get(
      '/api/v1/model_registry?namespace=nonexistent',
      'list-empty',
    );
    expect({ status: result.status, data: result.data }).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryRespone/content/application/json/schema',
      expectedStatus: 200,
    });
  });
});
