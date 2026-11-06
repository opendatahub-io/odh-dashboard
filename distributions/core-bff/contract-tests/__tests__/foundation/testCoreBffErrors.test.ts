/**
 * @jest-environment node
 */
import { ContractApiClient } from '@odh-dashboard/contract-tests';
import { apiSchema, expectError } from '../helpers';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const client = new ContractApiClient({
  baseUrl: process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080',
  defaultHeaders: { 'X-Request-ID': 'untrusted-correlation' },
});

describe('Core BFF shared error contract', () => {
  it.each(['/api/config', '/core-bff/api/config', '/wss/k8s/api/v1/pods'])(
    'should correlate missing-credential rejection on %s',
    async (path) => {
      const error = expectError(await client.get(path), 401);
      expect(error).toMatchContract(apiSchema, {
        ref: '#/components/responses/Unauthorized/content/application~1json/schema',
        status: 401,
      });
      const body = error.data as {
        code: string;
        message: string;
        requestId: string;
        error: string | { code: string; message: string; requestId: string };
      };
      const payload = typeof body.error === 'string' ? body : body.error;
      expect(payload.code).toBe('UNAUTHORIZED');
      expect(payload.requestId).toMatch(uuidV4);
      expect(error.headers?.['x-request-id']).toBe(payload.requestId);
      if (typeof body.error === 'string') {
        expect(body.error).toBe(body.message);
        expect(error).toMatchContract(apiSchema, {
          ref: '#/components/schemas/MessageErrorResponse',
          status: 401,
        });
      }
      expect(JSON.stringify(error.data)).not.toContain('untrusted-correlation');
    },
  );

  it('should create independent identifiers for concurrent failures', async () => {
    const errors = await Promise.all(
      Array.from({ length: 4 }, async () => expectError(await client.get('/api/config'), 401)),
    );
    const ids = errors.map((error) => error.headers?.['x-request-id']);
    ids.forEach((id) => expect(id).toMatch(uuidV4));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
