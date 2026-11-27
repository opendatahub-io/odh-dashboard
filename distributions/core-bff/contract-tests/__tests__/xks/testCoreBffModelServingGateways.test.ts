/**
 * @jest-environment node
 */
import { ContractApiClient } from '@odh-dashboard/contract-tests';
import { apiSchema, expectError, expectSuccess, unauthenticatedClient } from '../helpers';

// RHAI-50760: on xKS Core BFF serves model-serving-api's gateway discovery
// natively with the caller's credentials. The envtest Gateways and users are
// seeded in bff/internal/integrations/kubernetes/k8mocks (mock_gateways.go).

const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
const clientFor = (token: string) =>
  new ContractApiClient({ baseUrl, defaultHeaders: { 'x-forwarded-access-token': token } });

const admin = clientFor('FAKE_CLUSTER_ADMIN_TOKEN');
const gatewayDeployer = clientFor('FAKE_GATEWAY_DEPLOYER_TOKEN');
const llmDeployer = clientFor('FAKE_LLM_DEPLOYER_TOKEN');
const noAccess = clientFor('FAKE_USER_B_TOKEN');

const GATEWAYS = '/api/service/model-serving/api/v1/gateways';
const gatewaysFor = (namespace: string) => `${GATEWAYS}?namespace=${namespace}`;

type Gateway = { name: string; namespace: string; listener: string; status: string };
const keys = (data: unknown): string[] =>
  (data as { gateways: Gateway[] }).gateways.map(
    (g) => `${g.namespace}/${g.name}/${g.listener}/${g.status}`,
  );

const expectGateways = async (client: ContractApiClient, namespace: string) => {
  const result = expectSuccess(await client.get(gatewaysFor(namespace)));
  expect(result).toMatchContract(apiSchema, {
    ref: '#/components/responses/GatewaysResponse/content/application~1json/schema',
    status: 200,
  });
  return keys(result.response.data);
};

describe('Core BFF Model Serving gateway discovery - XKS Platform', () => {
  it('should list every listener that admits the namespace for a cluster admin', async () => {
    expect(await expectGateways(admin, 'test-ns-a')).toEqual([
      'opendatahub/selector-gateway/https/NotReady',
      'opendatahub/shared-gateway/http/Ready',
      'test-ns-a/project-gateway/default/Unknown',
    ]);
  });

  it('should leave out listeners that do not admit the namespace', async () => {
    expect(await expectGateways(admin, 'test-ns-b')).toEqual([
      'opendatahub/shared-gateway/http/Ready',
    ]);
  });

  it('should return the display name and description annotations', async () => {
    const result = expectSuccess(await admin.get(gatewaysFor('test-ns-b')));
    expect(result.response.data).toEqual({
      gateways: [
        {
          name: 'shared-gateway',
          namespace: 'opendatahub',
          listener: 'http',
          status: 'Ready',
          displayName: 'Shared gateway',
          description: 'Gateway for every project',
        },
      ],
    });
  });

  it('should leave out label-selector listeners when the caller cannot read the namespace', async () => {
    expect(await expectGateways(gatewayDeployer, 'test-ns-a')).toEqual([
      'opendatahub/shared-gateway/http/Ready',
      'test-ns-a/project-gateway/default/Unknown',
    ]);
  });

  it('should return an empty list when the caller may not deploy in the namespace', async () => {
    expect(await expectGateways(noAccess, 'test-ns-a')).toEqual([]);
    expect(await expectGateways(gatewayDeployer, 'test-ns-b')).toEqual([]);
  });

  it("should return the API server's 403 when the caller may not list Gateways", async () => {
    const error = expectError(await llmDeployer.get(gatewaysFor('test-ns-a')), 403);
    expect(error).toMatchContract(apiSchema, {
      ref: '#/components/responses/Forbidden/content/application~1json/schema',
      status: 403,
    });
    expect(error.data).toMatchObject({ kind: 'Status', reason: 'Forbidden', code: 403 });
  });

  it.each([
    ['missing', GATEWAYS],
    ['invalid', gatewaysFor('Not_A_Namespace')],
  ])('should return 400 for a %s namespace', async (_label, path) => {
    const error = expectError(await admin.get(path), 400);
    expect(error).toMatchContract(apiSchema, {
      ref: '#/components/responses/BadRequest/content/application~1json/schema',
      status: 400,
    });
  });

  it('should return 401 without a credential', async () => {
    const error = expectError(await unauthenticatedClient.get(gatewaysFor('test-ns-a')), 401);
    expect(error).toMatchContract(apiSchema, {
      ref: '#/components/responses/Unauthorized/content/application~1json/schema',
      status: 401,
    });
  });

  it('should return 405 for other methods', async () => {
    expectError(await admin.post(gatewaysFor('test-ns-a'), {}), 405);
  });

  it.each([
    '/api/service/model-serving/api/v1/samples/llm-d?type=router',
    '/api/service/model-serving/test-path',
    '/api/service/model-serving/nested/deep/path',
  ])('should not proxy %s to a model-serving-api that xKS does not deploy', async (path) => {
    const error = expectError(await admin.get(path), 404);
    expect(error).toMatchContract(apiSchema, {
      ref: '#/components/responses/BFFNotFound/content/application~1json/schema',
      status: 404,
    });
  });
});
