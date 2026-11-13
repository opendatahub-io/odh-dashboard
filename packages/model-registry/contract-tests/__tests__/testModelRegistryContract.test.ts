/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Model Registry BFF contracts', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080'; // Fallback for local development
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  const openApiPath = process.env.CONTRACT_OPENAPI_PATH || 'upstream/api/openapi/mod-arch.yaml';
  const apiSchema = loadOpenAPISchema(openApiPath, 'components');
  const registryPath = '/api/v1/model_registry/model-registry';
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

  it('should successfully retrieve model registries list', async () => {
    const result = await apiClient.get('/api/v1/model_registry?namespace=default');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryResponse/content/application~1json/schema',
      status: 200,
    });
  });

  it('should handle empty registry list', async () => {
    const result = await apiClient.get('/api/v1/model_registry?namespace=nonexistent');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelRegistryResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({ data: [] });
  });

  describe('Identity and registry access', () => {
    // Awaiting upstream OpenAPI change to note an array return in the response data
    // it('returns the available namespaces list', async () => {
    //   const result = await apiClient.get('/api/v1/namespaces', {
    //     headers: { 'kubeflow-userid': 'user@example.com' },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/NamespaceListResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: expect.arrayContaining([
    //       expect.objectContaining({ name: expect.any(String), displayName: expect.any(String) }),
    //     ]),
    //   });
    // });

    it('returns the user configuration', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: { userId: expect.any(String), clusterAdmin: expect.any(Boolean) },
      });
    });

    // BLOCKED (upstream): POST /api/v1/check-namespace-registry-access has no OpenAPI
    // operation or success schema. Resolve this path pointer when the operation is documented.
    // it('allows the seeded Dora namespace to access its registry', async () => {
    //   const result = await apiClient.post('/api/v1/check-namespace-registry-access', {
    //     data: {
    //       namespace: 'dora-namespace',
    //       registryName: 'model-registry-dora',
    //       registryNamespace: 'dora-namespace',
    //     },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1check-namespace-registry-access/post/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { hasAccess: true, cannotCheck: false },
    //   });
    // });

    // BLOCKED (upstream): same missing access-check success contract.
    // it('denies the seeded Bella namespace access to the Dora registry', async () => {
    //   const result = await apiClient.post('/api/v1/check-namespace-registry-access', {
    //     data: {
    //       namespace: 'bella-namespace',
    //       registryName: 'model-registry-dora',
    //       registryNamespace: 'dora-namespace',
    //     },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1check-namespace-registry-access/post/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { hasAccess: false, cannotCheck: false },
    //   });
    // });

    // BLOCKED (upstream): additionally needs a token-client fixture forbidden from creating
    // SubjectAccessReviews. The current internal mock client can create SARs regardless of headers.
    // it('reports cannotCheck when the caller cannot create SubjectAccessReviews', async () => {
    //   const result = await apiClient.post(
    //     '/api/v1/check-namespace-registry-access',
    //     {
    //       data: {
    //         namespace: 'dora-namespace',
    //         registryName: 'model-registry-dora',
    //         registryNamespace: 'dora-namespace',
    //       },
    //     },
    //     { headers: { 'kubeflow-userid': 'doraNonAdmin@example.com', 'kubeflow-groups': '' } },
    //   );
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1api~1v1~1check-namespace-registry-access/post/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { hasAccess: false, cannotCheck: true },
    //   });
    // });

    it('rejects an access check with missing registry fields', async () => {
      const result = await apiClient.post('/api/v1/check-namespace-registry-access', {
        data: { namespace: 'dora-namespace' },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
        expect(result.error.data).toMatchObject({
          error: { code: expect.any(String), message: expect.stringContaining('registryName') },
        });
      }
    });

    it('rejects malformed JSON for a namespace registry access check', async () => {
      const result = await apiClient.post('/api/v1/check-namespace-registry-access', '{"data":');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
        expect(result.error.data).toMatchObject({
          error: { code: expect.any(String), message: expect.any(String) },
        });
      }
    });
  });

  describe('Registered models and versions', () => {
    // MR writes return canned fixtures and do not establish persistence or archive semantics.
    it('lists registered models with pagination metadata', async () => {
      const result = await apiClient.get(`${registryPath}/registered_models${namespaceQuery}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/RegisteredModelListResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          ...pagination,
          items: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
          ]),
        },
      });
    });

    it('accepts a registered model creation envelope', async () => {
      const result = await apiClient.post(`${registryPath}/registered_models${namespaceQuery}`, {
        data: { name: 'Contract model', description: 'Contract request acceptance' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/RegisteredModelResponse/content/application~1json/schema',
        status: 201,
      });
      expect(getResponseData(result)).toMatchObject({
        data: { id: expect.any(String), name: expect.any(String), owner: expect.any(String) },
      });
    });

    it('returns registered model detail', async () => {
      const result = await apiClient.get(`${registryPath}/registered_models/2${namespaceQuery}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/RegisteredModelResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          id: expect.any(String),
          name: expect.any(String),
          owner: expect.any(String),
          state: expect.any(String),
        },
      });
    });

    it('accepts a registered model update envelope and archives the model', async () => {
      const result = await apiClient.patch(`${registryPath}/registered_models/1${namespaceQuery}`, {
        data: { description: 'Updated contract description', state: 'ARCHIVED' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/RegisteredModelResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: { id: expect.any(String), name: expect.any(String), owner: expect.any(String) },
      });
    });

    it('returns nested model versions with pagination metadata', async () => {
      const result = await apiClient.get(
        `${registryPath}/registered_models/2/versions${namespaceQuery}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelVersionListResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          ...pagination,
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              registeredModelId: expect.any(String),
            }),
          ]),
        },
      });
    });

    it('returns an empty version list for a model with no mock versions', async () => {
      const result = await apiClient.get(
        `${registryPath}/registered_models/contract-no-versions/versions${namespaceQuery}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelVersionListResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: { ...pagination, items: [], size: 0 },
      });
    });

    it('accepts a nested version creation envelope', async () => {
      const result = await apiClient.post(
        `${registryPath}/registered_models/1/versions${namespaceQuery}`,
        { data: { name: 'Contract version', registeredModelId: '1' } },
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelVersionResponse/content/application~1json/schema',
        status: 201,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          id: expect.any(String),
          name: expect.any(String),
          registeredModelId: expect.any(String),
        },
      });
    });

    it('returns model version detail', async () => {
      const result = await apiClient.get(`${registryPath}/model_versions/3${namespaceQuery}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelVersionResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          id: expect.any(String),
          name: expect.any(String),
          registeredModelId: expect.any(String),
        },
      });
    });

    it('accepts a version update envelope', async () => {
      const result = await apiClient.patch(`${registryPath}/model_versions/1${namespaceQuery}`, {
        data: { description: 'Updated contract version', state: 'ARCHIVED' },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelVersionResponse/content/application~1json/schema',
        status: 200,
      });
      expect(getResponseData(result)).toMatchObject({
        data: {
          id: expect.any(String),
          name: expect.any(String),
          registeredModelId: expect.any(String),
        },
      });
    });

    it('rejects a model creation without the required namespace', async () => {
      const result = await apiClient.post(`${registryPath}/registered_models`, {
        data: { name: 'Contract model' },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
        expect(result.error.data).toMatchObject({
          error: { code: expect.any(String), message: expect.any(String) },
        });
      }
    });

    it('rejects a model creation with a missing name', async () => {
      const result = await apiClient.post(`${registryPath}/registered_models${namespaceQuery}`, {
        data: { description: 'Missing required name' },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
        expect(result.error.data).toMatchObject({
          error: { code: expect.any(String), message: expect.any(String) },
        });
      }
    });

    // BLOCKED (upstream): GET /api/v1/model_registry/{registry}/model_versions is registered
    // but missing from OpenAPI. Its reusable response exists; do not count this draft as coverage.
    // it('lists global model versions with independent fixture ownership', async () => {
    //   const result = await apiClient.get(`${registryPath}/model_versions${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelVersionListResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       ...pagination,
    //       items: expect.arrayContaining([
    //         expect.objectContaining({ id: '3', name: 'Version Three', registeredModelId: '2' }),
    //       ]),
    //     },
    //   });
    // });

    // BLOCKED (upstream): POST on the global model_versions path is also undocumented.
    // it('accepts a global model version creation envelope', async () => {
    //   const result = await apiClient.post(`${registryPath}/model_versions${namespaceQuery}`, {
    //     data: { name: 'Contract version', registeredModelId: '1' },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelVersionResponse/content/application~1json/schema',
    //     status: 201,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { id: '1', name: 'Version One', registeredModelId: '1' },
    //   });
    // });
  });

  describe('Registry artifacts', () => {
    // BLOCKED (upstream): generic artifact list/create/detail operations are missing from
    // OpenAPI. Artifact.oneOf also accepts model artifacts as both ModelArtifact and DocArtifact;
    // discriminator values need constraints before the shared matcher can validate the union.
    // it('lists generic registry artifacts with pagination metadata', async () => {
    //   const result = await apiClient.get(`${registryPath}/artifacts${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ArtifactListResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       ...pagination,
    //       items: expect.arrayContaining([
    //         expect.objectContaining({
    //           id: expect.any(String), name: expect.any(String), artifactType: 'model-artifact',
    //         }),
    //       ]),
    //     },
    //   });
    // });
    //
    // BLOCKED (upstream): missing POST operation and ambiguous Artifact.oneOf.
    // The MR mock returns a canned artifact; this does not establish persistence.
    // it('accepts a generic artifact creation envelope', async () => {
    //   const result = await apiClient.post(`${registryPath}/artifacts${namespaceQuery}`, {
    //     data: {
    //       name: 'Contract artifact', artifactType: 'model-artifact',
    //       uri: 'oci://quay.io/test/contract-model:v1', state: 'LIVE',
    //     },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ArtifactResponse/content/application~1json/schema',
    //     status: 201,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       id: expect.any(String), name: expect.any(String),
    //       artifactType: 'model-artifact', uri: expect.any(String),
    //     },
    //   });
    //   expect(result.response?.headers.location).toEqual(expect.any(String));
    // });
    //
    // BLOCKED (upstream): missing GET detail operation and ambiguous Artifact.oneOf.
    // The mock ignores the requested ID; do not claim an ownership or unknown-ID contract.
    // it('returns a generic artifact detail envelope', async () => {
    //   const result = await apiClient.get(`${registryPath}/artifacts/1${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ArtifactResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       id: expect.any(String), name: expect.any(String),
    //       artifactType: 'model-artifact', uri: expect.any(String),
    //     },
    //   });
    // });
    //
    // BLOCKED (upstream): nested GET declares ArtifactListResponse but the handler returns
    // ModelArtifactListEnvelope. Align the operation to the model-specific response first.
    // it('lists model artifacts nested under a model version', async () => {
    //   const result = await apiClient.get(
    //     `${registryPath}/model_versions/1/artifacts${namespaceQuery}`,
    //   );
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelArtifactListResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       ...pagination,
    //       items: expect.arrayContaining([
    //         expect.objectContaining({ id: '1', name: 'Artifact One', uri: expect.any(String) }),
    //       ]),
    //     },
    //   });
    // });
    //
    // BLOCKED (upstream): nested POST declares generic ArtifactResponse/request data;
    // the handler consumes and returns ModelArtifactEnvelope. Resolve the operation first.
    // it('accepts a model artifact creation envelope nested under a version', async () => {
    //   const result = await apiClient.post(
    //     `${registryPath}/model_versions/1/artifacts${namespaceQuery}`,
    //     {
    //       data: {
    //         name: 'Contract model artifact', artifactType: 'model-artifact',
    //         uri: 'oci://quay.io/test/contract-model:v1', state: 'LIVE',
    //       },
    //     },
    //   );
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelArtifactResponse/content/application~1json/schema',
    //     status: 201,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { id: '1', name: 'Artifact One', uri: expect.any(String) },
    //   });
    //   expect(result.response?.headers.location).toBe(`${registryPath}/model_artifacts/1`);
    // });
    //
    // BLOCKED (upstream): spec uses singular /model_artifact/{artifact}; runtime registers
    // plural /model_artifacts/{artifact}. Align its response to ModelArtifactEnvelope as well.
    // it('accepts a model artifact update envelope', async () => {
    //   const result = await apiClient.patch(`${registryPath}/model_artifacts/1${namespaceQuery}`, {
    //     data: { description: 'Updated contract artifact', state: 'LIVE' },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelArtifactResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { id: expect.any(String), name: expect.any(String), uri: expect.any(String) },
    //   });
    // });
    //
    // BLOCKED (upstream): PATCH /api/v1/model_registry/{registry} invokes
    // UpdateModelVersionHandler without ModelVersionId. No success test for this malformed alias;
    // determine whether the route should be removed or replaced before adding a contract.
    // Consumer-only GET /api/v1/model_registry/{registry}/model_artifacts is not registered.
    // Resolve the frontend path or add its intended route/schema; do not test an invented endpoint.
  });

  describe('Infrastructure contracts', () => {
    // BLOCKED (upstream): /healthcheck has no 200 JSON response schema in mod-arch.yaml.
    // Runner readiness is not schema coverage; resolve this path pointer after documentation.
    // it('returns the healthcheck response contract', async () => {
    //   const result = await apiClient.get('/healthcheck');
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/paths/~1healthcheck/get/responses/200/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     status: expect.any(String), system_info: { version: expect.any(String) },
    //   });
    // });
    // GET /api/v1/swagger/*filepath is a dev-only smoke check, not a business contract.
  });
});
