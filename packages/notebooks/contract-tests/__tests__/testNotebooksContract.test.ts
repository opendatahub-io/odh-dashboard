/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

const CONTRACT_USER_HEADERS = {
  'kubeflow-userid': 'dev-user@example.com',
  'kubeflow-groups': 'system:masters',
};

type SwaggerDocument = Record<string, unknown> & {
  definitions?: Record<string, unknown>;
};

/** Resolve Swagger 2.0 #/definitions/* refs for AJV contract validation. */
function resolveSwagger2Definition(
  swagger: SwaggerDocument,
  definitionName: string,
): Record<string, unknown> {
  const definition = swagger.definitions?.[definitionName];
  if (!definition || typeof definition !== 'object') {
    throw new Error(`Missing swagger definition: ${definitionName}`);
  }
  return resolveSwagger2Refs(swagger, definition) as Record<string, unknown>;
}

function resolveSwagger2Refs(swagger: SwaggerDocument, node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((entry) => resolveSwagger2Refs(swagger, entry));
  }
  if (!node || typeof node !== 'object') {
    return node;
  }

  const obj = node as Record<string, unknown>;
  const ref = obj.$ref;
  if (typeof ref === 'string' && ref.startsWith('#/definitions/')) {
    const definitionName = ref.slice('#/definitions/'.length);
    const target = swagger.definitions?.[definitionName];
    if (!target) {
      throw new Error(`Unresolved swagger definition ref: ${ref}`);
    }
    return resolveSwagger2Refs(swagger, target);
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    resolved[key] = resolveSwagger2Refs(swagger, value);
  }
  return resolved;
}

describe('Notebooks Workspaces API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: CONTRACT_USER_HEADERS,
  });

  const apiSchema = loadOpenAPISchema(
    'upstream/workspaces/backend/openapi/swagger.json',
  ) as SwaggerDocument;

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/api/v1/healthcheck');
      expect(result).toMatchContract(
        resolveSwagger2Definition(apiSchema, 'health_check.HealthCheck'),
        {
          ref: '#',
          status: 200,
        },
      );
    });
  });

  describe('User Endpoint', () => {
    it('should return current user settings', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(resolveSwagger2Definition(apiSchema, 'api.UserEnvelope'), {
        ref: '#',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should list namespaces', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result).toMatchContract(
        resolveSwagger2Definition(apiSchema, 'api.NamespaceListEnvelope'),
        {
          ref: '#',
          status: 200,
        },
      );
    });
  });
});
