/**
 * @jest-environment node
 */
import { resolve } from 'path';
import {
  ContractApiClient,
  startGoTestFixture,
  type GoTestFixture,
} from '@odh-dashboard/contract-tests';
import { apiClient, apiSchema, expectError, expectSuccess } from '../helpers';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const upstreamAuditId = '2895b0a0-7694-47d0-8cb4-869b93fe68be';
const kubernetesFailures = [
  { status: 401, response: 'Unauthorized', reason: 'Unauthorized' },
  { status: 403, response: 'Forbidden', reason: 'Forbidden' },
  { status: 404, response: 'NotFound', reason: 'NotFound' },
  { status: 405, response: 'MethodNotAllowed', reason: 'MethodNotAllowed' },
  { status: 409, response: 'Conflict', reason: 'Conflict' },
  { status: 410, response: 'Gone', reason: 'Expired' },
  { status: 422, response: 'UnprocessableEntity', reason: 'Invalid' },
  { status: 429, response: 'TooManyRequests', reason: 'TooManyRequests' },
  { status: 500, response: 'InternalServerError', reason: 'InternalError' },
  { status: 502, response: 'BadGateway', reason: 'InternalError' },
  { status: 503, response: 'K8sUnavailable', reason: 'ServiceUnavailable' },
  { status: 504, response: 'K8sTimeout', reason: 'Timeout' },
];

interface KubernetesFailure {
  kind: string;
  code: number;
  reason: string;
  details?: {
    retryAfterSeconds?: number;
    causes?: { reason: string; field: string; message: string }[];
  };
}

interface BffFailure {
  error: { code: string; message: string; requestId: string };
}

describe('Core BFF error response components', () => {
  let fixtureClient: ContractApiClient;
  let fixture: GoTestFixture | undefined;

  beforeAll(async () => {
    fixture = await startGoTestFixture({
      bffDir: resolve(__dirname, '../../../bff'),
      packagePath: './internal/proxy',
      testName: 'TestContractFixtureServer',
    });
    fixtureClient = new ContractApiClient({
      baseUrl: fixture.url,
      defaultHeaders: {
        'X-Request-ID': 'untrusted-correlation',
        'Audit-ID': 'CANARY_AUDIT',
        Authorization: 'Bearer CANARY_TOKEN',
        Cookie: 'CANARY_COOKIE',
        'X-Test-Auth': 'CANARY_CUSTOM_TOKEN',
      },
    });
  }, 180000);

  afterAll(async () => {
    await fixture?.stop();
  });

  describe.each([
    { name: 'HTTP proxy', prefix: '/api/k8s', websocket: false },
    { name: 'prefixed HTTP proxy', prefix: '/core-bff/api/k8s', websocket: false },
    { name: 'WebSocket handshake', prefix: '/wss/k8s', websocket: true },
    { name: 'prefixed WebSocket handshake', prefix: '/core-bff/wss/k8s', websocket: true },
  ])('$name', ({ prefix, websocket }) => {
    it.each(kubernetesFailures)(
      'should preserve $status using the $response response component',
      async ({ status, response, reason }) => {
        const result = await fixtureClient.get(`${prefix}/status/${status}`, {
          headers: websocket
            ? {
                Connection: 'Upgrade',
                Upgrade: 'websocket',
                'Sec-WebSocket-Version': '13',
                'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                Origin: 'https://contract.example',
              }
            : {},
        });
        const error = expectError(result, status);
        expect(error).toMatchContract(apiSchema, {
          ref: `#/components/responses/${response}/content/application~1json/schema`,
          status,
        });
        expect(apiSchema).toHaveProperty(
          [
            'paths',
            websocket ? '/wss/k8s/{path}' : '/api/k8s/{path}',
            'get',
            'responses',
            String(status),
            '$ref',
          ],
          `#/components/responses/${response}`,
        );
        const body = error.data as KubernetesFailure;
        expect(body).toMatchObject({ kind: 'Status', code: status, reason });
        expect(body).not.toHaveProperty('error');
        expect(body.details).not.toHaveProperty('name');
        expect(body.details).not.toHaveProperty('uid');
        expect(error.headers?.['x-request-id']).toMatch(uuidV4);
        expect(error.headers?.['audit-id']).toBe(upstreamAuditId);
        expect(error.headers?.['x-request-id']).not.toBe(upstreamAuditId);
        expect(JSON.stringify(error)).not.toContain('CANARY');
        expect(JSON.stringify(error)).not.toContain('untrusted-correlation');
        if (!websocket) {
          expect(error.headers?.['x-upstream-request-id']).toBe(error.headers?.['x-request-id']);
        }
        if (status === 422) {
          expect(body.details?.causes).toEqual([
            { reason: 'FieldValueRequired', field: 'data', message: 'invalid field value' },
            {
              reason: 'FieldValueInvalid',
              field: 'spec.containers[1].image',
              message: 'invalid field value',
            },
          ]);
        }
        if ([429, 503, 504].includes(status)) {
          expect(body.details?.retryAfterSeconds).toBe(7);
          expect(error.headers?.['retry-after']).toBe('7');
        }
      },
    );
  });

  describe.each(['/api/k8s', '/core-bff/api/k8s'])('HTTP watches through %s', (prefix) => {
    it.each([
      'watch=true',
      'watch=1',
      'watch=TRUE',
      'watch=',
      'watch',
      'watch=anything',
      'watch=true&escaped=true',
    ])('should sanitize ERROR events for %s', async (query) => {
      const { response } = expectSuccess(await fixtureClient.get(`${prefix}/watch?${query}`));
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        type: 'ERROR',
        object: { kind: 'Status', code: 410, reason: 'Expired' },
      });
      expect(JSON.stringify(response.data)).not.toContain('CANARY');
    });
  });

  describe.each(['get', 'post', 'put', 'delete', 'patch'] as const)(
    'Model serving %s failures',
    (method) => {
      it.each([
        { cause: 'unavailable', status: 503, response: 'K8sUnavailable' },
        { cause: 'timeout', status: 504, response: 'K8sTimeout' },
      ])('should document and validate $status', async ({ cause, status, response }) => {
        const error = expectError(
          await fixtureClient[method](`/api/service/model-serving/transport/${cause}`),
          status,
        );
        expect(apiSchema).toHaveProperty(
          [
            'paths',
            '/api/service/model-serving/{path}',
            method,
            'responses',
            String(status),
            '$ref',
          ],
          `#/components/responses/${response}`,
        );
        expect(error).toMatchContract(apiSchema, {
          ref: `#/components/responses/${response}/content/application~1json/schema`,
          status,
        });
      });
    },
  );

  it.each([
    { cause: 'bad-gateway', status: 502, response: 'BadGateway', code: 'BAD_GATEWAY' },
    { cause: 'unavailable', status: 503, response: 'K8sUnavailable', code: 'SERVICE_UNAVAILABLE' },
    { cause: 'timeout', status: 504, response: 'K8sTimeout', code: 'GATEWAY_TIMEOUT' },
  ])(
    'should classify $cause as a BFF-generated $status response',
    async ({ cause, status, response, code }) => {
      const error = expectError(await fixtureClient.get(`/api/k8s/transport/${cause}`), status);
      expect(error).toMatchContract(apiSchema, {
        ref: `#/components/responses/${response}/content/application~1json/schema`,
        status,
      });
      const body = error.data as BffFailure;
      expect(body.error.code).toBe(code);
      expect(body.error.requestId).toMatch(uuidV4);
      expect(error.headers?.['x-request-id']).toBe(body.error.requestId);
      expect(error.headers?.['audit-id']).toBeUndefined();
      expect(body).not.toHaveProperty('kind');
      expect(JSON.stringify(error)).not.toContain('CANARY');
    },
  );

  it('should validate a native method rejection against MethodNotAllowed', async () => {
    const error = expectError(await apiClient.post('/api/v1/namespaces', {}), 405);
    expect(error).toMatchContract(apiSchema, {
      ref: '#/components/responses/MethodNotAllowed/content/application~1json/schema',
      status: 405,
    });
    const body = error.data as BffFailure;
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    expect(apiSchema).toHaveProperty(
      ['paths', '/api/v1/namespaces', 'get', 'responses', '405', '$ref'],
      '#/components/responses/MethodNotAllowed',
    );
    expect(body.error.requestId).toMatch(uuidV4);
    expect(error.headers?.['x-request-id']).toBe(body.error.requestId);
  });
});
