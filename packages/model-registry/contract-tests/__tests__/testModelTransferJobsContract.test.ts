/**
 * @jest-environment node
 */
import { randomUUID } from 'crypto';
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Transfer jobs', () => {
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
  const registryPath = '/api/v1/model_registry/model-registry';
  const namespaceQuery = '?namespace=kubeflow';
  const jobQuery = '?namespace=kubeflow&jobNamespace=kubeflow';
  const ownedJobs = new Set<string>();
  const jobPayload = {
    jobDisplayName: 'Contract transfer job',
    namespace: 'kubeflow',
    source: {
      type: 's3',
      bucket: 'test-bucket',
      key: 'models/test',
      awsAccessKeyId: 'test-key',
      awsSecretAccessKey: 'test-secret',
    },
    destination: {
      type: 'oci',
      uri: 'quay.io/test/model:v1',
      registry: 'quay.io',
      username: 'user',
      password: 'pass',
    },
    uploadIntent: 'create_model',
    registeredModelName: 'Contract model',
    modelVersionName: 'v1.0.0',
  };

  const getResponseData = (result: Awaited<ReturnType<typeof apiClient.get>>) => {
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.response.data;
  };

  // Successful retry needs a test-owned failed job; new envtest jobs stay pending.
  // Nonempty seed lists include transfer-job-004 with empty, invalid enum values.
  afterAll(async () => {
    const results = [];
    for (const name of ownedJobs) {
      // Handler returns 200; OpenAPI says 204. Cleanup is not a DELETE contract.
      results.push(
        await apiClient.delete(`${registryPath}/model_transfer_jobs/${name}${jobQuery}`),
      );
    }
    for (const result of results) {
      expect(result.success).toBe(true);
      if (result.success) expect(result.response.status).toBe(200);
    }
  });

  it('returns an empty transfer list when the job namespace has no jobs', async () => {
    // Do not filter invalid seed entries out of a received response to make it validate.
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs${namespaceQuery}&jobNamespace=dora-namespace`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelTransferJobListResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        items: [],
        size: 0,
        pageSize: expect.any(Number),
        nextPageToken: expect.any(String),
      },
    });
  });

  it('returns an enriched transfer job', async () => {
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs/transfer-job-001${jobQuery}`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelTransferJobResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        name: expect.any(String),
        namespace: expect.any(String),
        registeredModelId: expect.any(String),
        registeredModelName: expect.any(String),
        modelVersionName: expect.any(String),
        status: expect.any(String),
      },
    });
  });

  it('creates a test-owned transfer job', async () => {
    const name = `contract-${randomUUID()}`;
    const result = await apiClient.post(`${registryPath}/model_transfer_jobs${namespaceQuery}`, {
      data: { ...jobPayload, name },
    });
    if (result.success) ownedJobs.add(name);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelTransferJobResponse/content/application~1json/schema',
      status: 201,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        name: expect.any(String),
        namespace: expect.any(String),
        jobDisplayName: expect.any(String),
        registeredModelName: expect.any(String),
        modelVersionName: expect.any(String),
      },
    });
  });

  it('rejects retrying a pending test-owned job', async () => {
    const name = `contract-${randomUUID()}`;
    const setup = await apiClient.post(`${registryPath}/model_transfer_jobs${namespaceQuery}`, {
      data: { ...jobPayload, name },
    });
    if (setup.success) ownedJobs.add(name);
    expect(setup.response?.status).toBe(201);
    getResponseData(setup);

    const retryName = `contract-${randomUUID()}`;
    const result = await apiClient.patch(
      `${registryPath}/model_transfer_jobs/${name}${namespaceQuery}`,
      { data: { name: retryName, jobDisplayName: 'Contract retry', namespace: 'kubeflow' } },
    );
    if (result.success) ownedJobs.add(retryName);
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

  it('returns pod events for a seeded transfer job', async () => {
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs/transfer-job-001/events${jobQuery}`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelTransferJobEventsResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({
      data: {
        events: expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            reason: expect.any(String),
            message: expect.any(String),
            timestamp: expect.any(String),
          }),
        ]),
      },
    });
  });

  it('returns an empty event list for a test-owned job with no pods', async () => {
    const name = `contract-${randomUUID()}`;
    const setup = await apiClient.post(`${registryPath}/model_transfer_jobs${namespaceQuery}`, {
      data: { ...jobPayload, name },
    });
    if (setup.success) ownedJobs.add(name);
    expect(setup.response?.status).toBe(201);
    getResponseData(setup);
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs/${name}/events${jobQuery}`,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ModelTransferJobEventsResponse/content/application~1json/schema',
      status: 200,
    });
    expect(getResponseData(result)).toMatchObject({ data: { events: [] } });
  });

  it('rejects a detail request missing the job namespace', async () => {
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs/transfer-job-001${namespaceQuery}`,
    );
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

  it('returns not found for an absent Kubernetes job', async () => {
    const result = await apiClient.get(
      `${registryPath}/model_transfer_jobs/contract-missing-job${jobQuery}`,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchContract(apiSchema, {
        ref: '#/components/responses/NotFound/content/application~1json/schema',
        status: 404,
      });
      expect(result.error.data).toMatchObject({
        error: { code: expect.any(String), message: expect.any(String) },
      });
    }
  });

  // BLOCKED (upstream fixture): transfer-job-004 has empty enum fields, so the unmodified
  // seeded list fails ModelTransferJobListResponse. Keep the whole response under validation.
  // The active empty-list test above already covers this HTTP operation, not this scenario.
  // it('lists enriched seeded transfer jobs without filtering invalid fixtures', async () => {
  //   const result = await apiClient.get(`${registryPath}/model_transfer_jobs${jobQuery}`);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/ModelTransferJobListResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: {
  //       items: expect.arrayContaining([
  //         expect.objectContaining({ name: 'transfer-job-001', registeredModelName: 'Model One' }),
  //       ]),
  //       size: expect.any(Number), pageSize: expect.any(Number), nextPageToken: expect.any(String),
  //     },
  //   });
  // });

  // BLOCKED (upstream fixture): a successful PATCH retry requires a failed test-owned job.
  // POST-created jobs remain pending in envtest; no BFF endpoint marks them failed.
  // Add deterministic failed-owned-job support before enabling this draft. Never retry/delete
  // a shared seeded job merely to obtain a passing response.
  // it('retries a failed test-owned transfer job under a new name', async () => {
  //   const name = `contract-${randomUUID()}`;
  //   const setup = await apiClient.post(`${registryPath}/model_transfer_jobs${namespaceQuery}`, {
  //     data: { ...jobPayload, name },
  //   });
  //   if (setup.success) ownedJobs.add(name);
  //   expect(setup.response?.status).toBe(201);
  //   getResponseData(setup);
  //   // Prerequisite: the upstream fixture must transition this owned job to Failed.
  //   const retryName = `contract-${randomUUID()}`;
  //   const result = await apiClient.patch(
  //     `${registryPath}/model_transfer_jobs/${name}${namespaceQuery}`,
  //     { data: { name: retryName, jobDisplayName: 'Contract retry', namespace: 'kubeflow' } },
  //   );
  //   if (result.success) ownedJobs.add(retryName);
  //   expect(result).toMatchContract(apiSchema, {
  //     ref: '#/components/responses/ModelTransferJobResponse/content/application~1json/schema',
  //     status: 200,
  //   });
  //   expect(getResponseData(result)).toMatchObject({
  //     data: { name: retryName, namespace: 'kubeflow', jobDisplayName: 'Contract retry' },
  //   });
  // });

  // BLOCKED (upstream): DELETE is documented as 204, but the handler returns 200 JSON.
  // it('deletes only a test-owned transfer job with a bodyless 204', async () => {
  //   const name = `contract-${randomUUID()}`;
  //   const setup = await apiClient.post(`${registryPath}/model_transfer_jobs${namespaceQuery}`, {
  //     data: { ...jobPayload, name },
  //   });
  //   if (setup.success) ownedJobs.add(name);
  //   expect(setup.response?.status).toBe(201);
  //   getResponseData(setup);
  //   const result = await apiClient.delete(
  //     `${registryPath}/model_transfer_jobs/${name}${jobQuery}`,
  //   );
  //   expect(result.success).toBe(true);
  //   if (result.success) {
  //     ownedJobs.delete(name);
  //     expect(result.response.status).toBe(204);
  //     expect(result.response.data).toBe('');
  //   }
  // });
});
