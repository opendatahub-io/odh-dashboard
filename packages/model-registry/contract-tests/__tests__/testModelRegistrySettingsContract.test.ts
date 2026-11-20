/**
 * @jest-environment node
 */
import { randomUUID } from 'crypto';
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Registry settings and Kubernetes resources', () => {
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
  const bindingPath = '/api/v1/settings/role_bindings';
  const binding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: { name: `contract-${randomUUID()}` },
    subjects: [{ kind: 'User', name: 'contract-user', apiGroup: 'rbac.authorization.k8s.io' }],
    roleRef: { kind: 'Role', name: 'contract-reader', apiGroup: 'rbac.authorization.k8s.io' },
  };

  const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.response.data;
  };

  // Awaiting upstream OpenAPI change to note an array return in the response data
  // it('returns the settings namespaces list', async () => {
  //   const result = await apiClient.get('/api/v1/settings/namespaces', {
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

  it('returns the documented certificate stub', async () => {
    const result = await apiClient.get(`/api/v1/settings/certificates${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/CertificateListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        secrets: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String), keys: expect.any(Array) }),
        ]),
        configMaps: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String), keys: expect.any(Array) }),
        ]),
      },
    });
  });

  it('returns role binding subjects and role references', async () => {
    const result = await apiClient.get(`${bindingPath}${namespaceQuery}`);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/RoleBindingListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        items: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({ name: expect.any(String) }),
            subjects: expect.any(Array),
            roleRef: expect.any(Object),
          }),
        ]),
      },
    });
  });

  it('accepts a role binding creation envelope in the stub', async () => {
    const result = await apiClient.post(`${bindingPath}${namespaceQuery}`, { data: binding });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/RoleBindingResponse/content/application~1json/schema',
      status: 201,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        metadata: expect.objectContaining({ name: expect.any(String) }),
        subjects: expect.any(Array),
        roleRef: expect.any(Object),
      },
    });
  });

  it('accepts a role binding update envelope in the stub', async () => {
    const result = await apiClient.patch(
      `${bindingPath}/${binding.metadata.name}${namespaceQuery}`,
      { data: { ...binding, metadata: {} } },
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/RoleBindingResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        metadata: expect.objectContaining({ name: expect.any(String) }),
        subjects: expect.any(Array),
        roleRef: expect.any(Object),
      },
    });
  });

  it('returns a bodyless 204 for role binding deletion in the stub', async () => {
    const result = await apiClient.delete(
      `${bindingPath}/${binding.metadata.name}${namespaceQuery}`,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.response.status).toBe(204);
      expect(result.response.data).toBe('');
    }
  });

  it('returns group objects with their users at the registered settings path', async () => {
    const result = await apiClient.get('/api/v1/settings/groups');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/paths/~1api~1v1~1settings~1groups/get/responses/200/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          metadata: expect.objectContaining({ name: expect.any(String) }),
          users: expect.any(Array),
        }),
      ]),
    });
  });

  describe('Registry settings in the mock fallback profile', () => {
    // These drafts target --mock-k8s-client, which disables Red Hat settings overrides.
    // They do not establish the real controller's persistence or permission behavior.
    // Keep setup and cleanup commented with the blocked success cases below.
    // const settingsPath = '/api/v1/settings/model_registry';
    // const ownedRegistries = new Set<string>();
    // afterAll(async () => {
    //   for (const name of ownedRegistries) {
    //     const cleanup = await apiClient.delete(`${settingsPath}/${name}${namespaceQuery}`);
    //     expect(cleanup.success).toBe(true);
    //     // Mock fallback returns 200 JSON; cleanup is not DELETE contract coverage.
    //   }
    // });

    // BLOCKED (upstream): GET /api/v1/settings/model_registry returns data as an array;
    // ModelRegistryKindListResponse declares a paginated object. Stub conditions may also be null.
    // it('lists registry settings from the mock fallback', async () => {
    //   const result = await apiClient.get(`${settingsPath}${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelRegistryKindListResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: expect.arrayContaining([
    //       expect.objectContaining({
    //         kind: 'ModelRegistry',
    //         metadata: expect.objectContaining({ name: 'model-registry', namespace: 'kubeflow' }),
    //       }),
    //     ]),
    //   });
    // });

    // BLOCKED (upstream): POST success includes status.conditions: null, but the schema
    // declares an array. Choose/correct the fallback contract before enabling this case.
    // it('creates test-owned registry settings in the mock fallback', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const result = await apiClient.post(`${settingsPath}${namespaceQuery}`, {
    //     data: {
    //       modelRegistry: {
    //         apiVersion: 'modelregistry.io/v1alpha1', kind: 'ModelRegistry',
    //         metadata: { name, namespace: 'kubeflow' },
    //       },
    //     },
    //   });
    //   if (result.success) ownedRegistries.add(name);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelRegistryKindResponse/content/application~1json/schema',
    //     status: 201,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       kind: 'ModelRegistry', metadata: { name, namespace: 'kubeflow' },
    //       spec: { databaseConfig: { databaseType: 'mysql', host: 'model-registry-db' } },
    //     },
    //   });
    //   expect(result.response?.headers.location).toContain(`${settingsPath}/${name}`);
    // });

    // BLOCKED (upstream): GET detail returns data.modelRegistryKind and data.databasePassword;
    // ModelRegistryAndCredentialsResponse instead declares ModelRegistryKind directly in data.
    // Permissive optional fields can otherwise make this schema check pass without validation.
    // it('returns registry settings and credentials in the mock fallback envelope', async () => {
    //   const result = await apiClient.get(`${settingsPath}/model-registry${namespaceQuery}`);
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelRegistryAndCredentialsResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: {
    //       modelRegistryKind: {
    //         kind: 'ModelRegistry', metadata: { name: 'model-registry', namespace: 'kubeflow' },
    //       },
    //       databasePassword: expect.any(String),
    //     },
    //   });
    // });

    // BLOCKED (upstream): PATCH success has the same null conditions/schema mismatch as POST.
    // The fallback ignores changes, so this is request acceptance, not update persistence.
    // it('accepts an update for test-owned registry settings in the mock fallback', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${settingsPath}${namespaceQuery}`, {
    //     data: { modelRegistry: { metadata: { name, namespace: 'kubeflow' } } },
    //   });
    //   if (setup.success) ownedRegistries.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.patch(`${settingsPath}/${name}${namespaceQuery}`, {
    //     data: { metadata: { name, namespace: 'kubeflow', annotations: { description: 'Updated' } } },
    //   });
    //   expect(result).toMatchContract(apiSchema, {
    //     ref: '#/components/responses/ModelRegistryKindResponse/content/application~1json/schema',
    //     status: 200,
    //   });
    //   expect(getResponseData(result)).toMatchObject({
    //     data: { kind: 'ModelRegistry', metadata: { name, namespace: 'kubeflow' } },
    //   });
    // });

    // BLOCKED (upstream): DELETE is documented as 204, but the mock fallback returns 200 JSON.
    // Do not use dryRun to claim deletion: the downstream dry-run response is also 200.
    // it('deletes only test-owned registry settings with a bodyless 204', async () => {
    //   const name = `contract-${randomUUID()}`;
    //   const setup = await apiClient.post(`${settingsPath}${namespaceQuery}`, {
    //     data: { modelRegistry: { metadata: { name, namespace: 'kubeflow' } } },
    //   });
    //   if (setup.success) ownedRegistries.add(name);
    //   expect(setup.response?.status).toBe(201);
    //   getResponseData(setup);
    //   const result = await apiClient.delete(`${settingsPath}/${name}${namespaceQuery}`);
    //   expect(result.success).toBe(true);
    //   if (result.success) {
    //     ownedRegistries.delete(name);
    //     expect(result.response.status).toBe(204);
    //     expect(result.response.data).toBe('');
    //   }
    // });

    it('rejects registry settings creation without a resource name in the mock fallback', async () => {
      const result = await apiClient.post(`/api/v1/settings/model_registry${namespaceQuery}`, {
        data: { modelRegistry: { metadata: {} } },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchContract(apiSchema, {
          ref: '#/components/responses/BadRequest/content/application~1json/schema',
          status: 400,
        });
        expect(result.error.data).toMatchObject({
          error: {
            code: expect.any(String),
            message: expect.stringContaining('model registry name is required'),
          },
        });
      }
    });
  });

  // BLOCKED (upstream): GET /api/v1/settings/services lacks an OpenAPI operation/schema.
  // --mock-k8s-client disables the downstream override, leaving a 501 fallback. A 200 test
  // needs the Red Hat implementation plus a deterministic Kubernetes service fixture.
  // it('lists Kubernetes service names and namespaces', async () => {
  //   const result = await apiClient.get(`/api/v1/settings/services${namespaceQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/paths/~1api~1v1~1settings~1services/get/responses/200/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: expect.arrayContaining([
  //       expect.objectContaining({ name: 'model-registry', namespace: 'kubeflow' }),
  //     ]),
  //   });
  // });

  // Consumer-only GET /api/v1/groups is not registered; the existing test intentionally
  // targets /api/v1/settings/groups. Resolve the consumer path upstream rather than invent an alias.
});
