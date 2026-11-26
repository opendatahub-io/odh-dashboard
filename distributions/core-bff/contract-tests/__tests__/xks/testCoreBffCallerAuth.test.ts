/**
 * @jest-environment node
 */
import { ContractApiClient } from '@odh-dashboard/contract-tests';
import { apiClient, apiSchema, expectError, expectSuccess } from '../helpers';

// RHOAIENG-96081 / RHOAIENG-101218. The xKS suite runs the BFF with
// --auth-token-headers=Authorization,x-forwarded-access-token, the candidate
// xKS gateway contract (see docs/runtime-contract.md, "Caller credentials").

const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
const bareClient = new ContractApiClient({ baseUrl });

const ADMIN = 'FAKE_CLUSTER_ADMIN_TOKEN';
const SERVING_EDITOR = 'FAKE_SERVING_EDITOR_TOKEN';
const NO_ACCESS = 'FAKE_USER_B_TOKEN';

describe('Core BFF caller credentials - XKS Platform', () => {
  describe('header precedence', () => {
    it.each([
      ['Authorization: Bearer only', { authorization: `Bearer ${ADMIN}` }],
      ['x-forwarded-access-token only', { 'x-forwarded-access-token': ADMIN }],
      [
        'both headers carrying the same token',
        { authorization: `Bearer ${ADMIN}`, 'x-forwarded-access-token': ADMIN },
      ],
    ])('should accept %s', async (_label, headers) => {
      const result = expectSuccess(await bareClient.get('/api/status', { headers }));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/StatusResponse/content/application~1json/schema',
        status: 200,
      });
      expect(JSON.stringify(result.response.data)).not.toContain(ADMIN);
    });

    it.each([
      ['no credential', {}],
      ['a non-Bearer Authorization scheme', { authorization: 'Basic dXNlcjpwYXNz' }],
      [
        'a malformed Authorization even with a valid fallback',
        { authorization: 'Basic dXNlcjpwYXNz', 'x-forwarded-access-token': ADMIN },
      ],
      [
        'two different tokens',
        { authorization: `Bearer ${ADMIN}`, 'x-forwarded-access-token': NO_ACCESS },
      ],
      ['a whitespace-only token', { 'x-forwarded-access-token': '   ' }],
      [
        'identity headers without a credential',
        { 'x-forwarded-user': 'admin', 'impersonate-user': 'admin' },
      ],
    ])('should reject %s with 401', async (_label, headers) => {
      const error = expectError(await bareClient.get('/api/status', { headers }), 401);
      expect(error).toMatchContract(apiSchema, {
        ref: '#/components/responses/Unauthorized/content/application~1json/schema',
        status: 401,
      });
      expect(JSON.stringify(error.data)).not.toContain(ADMIN);
      expect(JSON.stringify(error.data)).not.toContain(NO_ACCESS);
    });

    it('should fail closed on the Kubernetes proxy without a credential', async () => {
      expectError(await bareClient.get('/api/k8s/api/v1/namespaces'), 401);
    });

    it('should authenticate the Kubernetes proxy with Authorization: Bearer', async () => {
      expectSuccess(
        await bareClient.get('/api/k8s/api/v1/namespaces/test-ns-a', {
          headers: { authorization: `Bearer ${ADMIN}` },
        }),
      );
    });
  });

  describe('user-initiated mutations use the caller credential', () => {
    const asUser = (token: string) =>
      new ContractApiClient({ baseUrl, defaultHeaders: { authorization: `Bearer ${token}` } });

    it('should apply the namespace mutation for a caller who may patch the namespace', async () => {
      const result = expectSuccess(await apiClient.get('/api/namespaces/test-ns-a/1'));
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/NamespaceMutationResponse',
        status: 200,
      });
      expect(result.response.data).toEqual({ applied: true });
    });

    it.each([
      ['a real request', '/api/namespaces/test-ns-a/1'],
      ['a dry run', '/api/namespaces/test-ns-a/1?dryRun=All'],
    ])(
      'should not let the service account apply %s the caller cannot perform',
      async (_label, path) => {
        // The caller passes the handler's servingruntimes review but holds no
        // Namespace patch permission. On OpenShift the service account would
        // apply it; on xKS the caller's own credential is used and is denied.
        const result = expectSuccess(await asUser(SERVING_EDITOR).get(path));
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/schemas/NamespaceMutationResponse',
          status: 200,
        });
        expect(result.response.data).toEqual({ applied: false });
      },
    );

    it('should still deny a caller who fails the access review', async () => {
      expectError(await asUser(NO_ACCESS).get('/api/namespaces/test-ns-a/1'), 403);
    });
  });
});
