/**
 * @jest-environment node
 */
import { ContractApiClient } from '@odh-dashboard/contract-tests';
import { apiSchema, expectError, expectSuccess } from '../helpers';

// The OpenShift profile keeps the single-header contract and the
// privileged-watcher credential model. These pin that RHOAIENG-96081 and
// RHOAIENG-101218 did not change it.

const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
const bareClient = new ContractApiClient({ baseUrl });

describe('Core BFF caller credentials - OpenShift Platform', () => {
  it('should read only x-forwarded-access-token', async () => {
    expectSuccess(
      await bareClient.get('/api/status', {
        headers: { 'x-forwarded-access-token': 'FAKE_CLUSTER_ADMIN_TOKEN' },
      }),
    );
    expectError(
      await bareClient.get('/api/status', {
        headers: { authorization: 'Bearer FAKE_CLUSTER_ADMIN_TOKEN' },
      }),
      401,
    );
  });

  it('should keep applying the namespace mutation with the service account', async () => {
    const editor = new ContractApiClient({
      baseUrl,
      defaultHeaders: { 'x-forwarded-access-token': 'FAKE_SERVING_EDITOR_TOKEN' },
    });
    const result = expectSuccess(await editor.get('/api/namespaces/test-ns-a/1?dryRun=All'));
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/schemas/NamespaceMutationResponse',
      status: 200,
    });
    expect(result.response.data).toEqual({ applied: true });
  });
});
