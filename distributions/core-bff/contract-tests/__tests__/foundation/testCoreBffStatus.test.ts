/**
 * @jest-environment node
 */
import { resolve } from 'path';
import {
  ContractApiClient,
  startGoTestFixture,
  type GoTestFixture,
} from '@odh-dashboard/contract-tests';
import {
  apiClient,
  unauthenticatedClient,
  restrictedClient,
  apiSchema,
  expectSuccess,
  expectError,
} from '../helpers';

describe('Core BFF Status Endpoints', () => {
  describe('Status Endpoint', () => {
    it('should return user session status', async () => {
      const result = await apiClient.get('/api/status');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/StatusResponse/content/application~1json/schema',
        status: 200,
      });
      const { response } = expectSuccess(result);
      const body = response.data as { kube: Record<string, unknown> };
      expect(body.kube).toHaveProperty('userName');
      expect(body.kube).toHaveProperty('isAdmin');
      expect(body.kube).toHaveProperty('isAllowed');
      expect(body.kube).toHaveProperty('clusterBranding');
      expect(body.kube).toHaveProperty('currentContext');
      expect(body.kube).toHaveProperty('currentUser');
      expect(body.kube.currentUser).toHaveProperty('name');
    });

    it('should return 401 when no auth token is provided', async () => {
      expectError(await unauthenticatedClient.get('/api/status'), 401);
    });

    it('should return status for non-admin authenticated user', async () => {
      const { response } = expectSuccess(await restrictedClient.get('/api/status'));
      const body = response.data as { kube: Record<string, unknown> };
      expect(body.kube).toHaveProperty('userName');
    });
  });
});

describe('Core BFF status failure contract', () => {
  let fixture: GoTestFixture | undefined;
  let nativeClient: ContractApiClient;
  beforeAll(async () => {
    fixture = await startGoTestFixture({
      bffDir: resolve(__dirname, '../../../bff'),
      packagePath: './internal/api',
      testName: 'TestNativeContractFixtureServer',
    });
    nativeClient = new ContractApiClient({ baseUrl: fixture.url });
  }, 180000);
  afterAll(async () => {
    await fixture?.stop();
  });
  it.each([true, false])(
    'should preserve completed allowed=%s reviews with diagnostics',
    async (allowed) => {
      const result = expectSuccess(
        await nativeClient.get('/api/status', {
          headers: { 'x-forwarded-access-token': allowed ? 'allowed' : 'denied' },
        }),
      );
      expect(result.response.data).toMatchObject({
        kube: { isAdmin: false, isAllowed: allowed },
      });
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/StatusResponse/content/application~1json/schema',
        status: 200,
      });
      expect(JSON.stringify(result.response.data)).not.toContain('CANARY');
    },
  );

  it('should return 401 when identity cannot be resolved', async () => {
    const result = expectError(
      await nativeClient.get('/api/status', {
        headers: { 'x-forwarded-access-token': 'unresolved' },
      }),
      401,
    );
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/Unauthorized/content/application~1json/schema',
      status: 401,
    });
  });

  it.each([
    { token: 'review-failure', allowed: false },
    { token: 'admin-review-failure', allowed: true },
  ])('should preserve the authenticated session for $token', async ({ token, allowed }) => {
    const result = expectSuccess(
      await nativeClient.get('/api/status', {
        headers: { 'x-forwarded-access-token': token },
      }),
    );
    expect(result.response.data).toMatchObject({
      kube: { userName: 'user', isAdmin: false, isAllowed: allowed },
    });
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/StatusResponse/content/application~1json/schema',
      status: 200,
    });
    expect(JSON.stringify(result.response.data)).not.toContain('CANARY');
  });

  it('should still reject guarded operations when the admin review fails', async () => {
    const result = expectError(
      await nativeClient.patch(
        '/api/config',
        {},
        {
          headers: { 'x-forwarded-access-token': 'review-failure' },
        },
      ),
      403,
    );
    expect(JSON.stringify(result.data)).not.toContain('CANARY');
  });
});
