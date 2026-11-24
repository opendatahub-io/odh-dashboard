/**
 * @jest-environment node
 *
 * xKS authorized namespace discovery. The mock BFF runs with
 * --namespace-candidates=test-ns-a,test-ns-b,test-ns-c; user B is read-only on
 * LLMInferenceServices in test-ns-b and cannot list namespaces.
 * See distributions/core-bff/docs/namespace-discovery-contract.md.
 */
import { ContractApiClient } from '@odh-dashboard/contract-tests';
import {
  apiClient,
  apiSchema,
  restrictedClient,
  unauthenticatedClient,
  expectSuccess,
  expectError,
} from '../helpers';

const PATH = '/api/v1/namespace-access';

type NamespaceAccess = {
  name: string;
  actions: Record<string, boolean>;
  permissions: Record<string, Record<string, string>>;
};
type NamespaceAccessList = {
  source: string;
  complete: boolean;
  issues: unknown[];
  namespaces: NamespaceAccess[];
};

const userAClient = new ContractApiClient({
  baseUrl: process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080',
  defaultHeaders: { 'x-forwarded-access-token': 'FAKE_USER_A_TOKEN' },
});

const dataOf = (result: Awaited<ReturnType<ContractApiClient['get']>>): NamespaceAccessList => {
  const { response } = expectSuccess(result);
  return (response.data as { data: NamespaceAccessList }).data;
};

describe('Core BFF namespace access - XKS Platform', () => {
  it('discovers a read-only namespace for a user who cannot list namespaces', async () => {
    const result = await restrictedClient.get(PATH);
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/schemas/NamespaceAccessListEnvelope',
      status: 200,
    });
    const data = dataOf(result);
    expect(data.source).toBe('candidates');
    expect(data.complete).toBe(true);
    expect(data.namespaces.map((ns) => ns.name)).toEqual(['test-ns-b']);
    expect(data.namespaces[0].actions).toEqual({
      view: true,
      deploy: false,
      edit: false,
      startStop: false,
      delete: false,
      createTokenAuth: false,
      manageTokenAuth: false,
    });
    expect(data.namespaces[0].permissions['serving.kserve.io/llminferenceservices'].create).toBe(
      'denied',
    );
  });

  it('offers deploy and delete only where the caller holds them', async () => {
    const data = dataOf(await userAClient.get(PATH));
    expect(data.namespaces.map((ns) => ns.name)).toEqual(['test-ns-a']);
    expect(data.namespaces[0].actions.deploy).toBe(true);
    expect(data.namespaces[0].actions.startStop).toBe(true);
    expect(data.namespaces[0].actions.delete).toBe(true);
    expect(data.namespaces[0].actions.createTokenAuth).toBe(true);
    expect(data.namespaces[0].actions.manageTokenAuth).toBe(true);
  });

  it('uses the cluster list for a caller who may list namespaces', async () => {
    const data = dataOf(await apiClient.get(PATH));
    expect(data.source).toBe('cluster-list');
    expect(data.namespaces.map((ns) => ns.name)).toEqual(
      expect.arrayContaining(['test-ns-a', 'test-ns-b', 'test-ns-c']),
    );
  });

  it('evaluates manual-entry namespaces without revealing denied ones', async () => {
    const data = dataOf(
      await restrictedClient.get(`${PATH}?namespace=test-ns-b&namespace=opendatahub`),
    );
    expect(data.namespaces.map((ns) => ns.name)).toEqual(['test-ns-b']);
  });

  it('rejects an invalid manual-entry name', async () => {
    const { data } = expectError(await restrictedClient.get(`${PATH}?namespace=Not_Valid`), 400);
    expect(JSON.stringify(data)).not.toContain('Not_Valid');
  });

  it('requires authentication', async () => {
    expectError(await unauthenticatedClient.get(PATH), 401);
  });

  describe('single namespace lookup', () => {
    it('returns the permission matrix for an authorized namespace', async () => {
      const result = await restrictedClient.get(`${PATH}/test-ns-b`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NamespaceAccessEnvelope',
        status: 200,
      });
    });

    it('returns the same 403 for a denied and a nonexistent namespace', async () => {
      const denied = expectError(await restrictedClient.get(`${PATH}/test-ns-a`), 403);
      const missing = expectError(await restrictedClient.get(`${PATH}/does-not-exist`), 403);
      expect(JSON.stringify(denied.data)).not.toContain('test-ns-a');
      expect(JSON.stringify(missing.data)).not.toContain('does-not-exist');
    });
  });

  it('honours a RoleBinding on the existing namespace lookup', async () => {
    // user A has no cluster-scoped grant on test-ns-a, only a RoleBinding inside it.
    expectSuccess(await userAClient.get('/api/v1/namespaces/test-ns-a'));
  });
});
