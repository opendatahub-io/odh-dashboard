/**
 * @jest-environment node
 */
import { resolve } from 'path';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
  setUtilsConfig,
} from '@openshift/dynamic-plugin-sdk-utils';
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
    name?: string;
    retryAfterSeconds?: number;
    causes?: { reason: string; field: string; message: string }[];
  };
}

interface BffFailure {
  error: { code: string; message: string; requestId: string };
}

const model = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
  label: 'ConfigMap',
  labelPlural: 'ConfigMaps',
  abbr: 'CM',
  namespaced: true,
};
const resource = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: { name: 'example', namespace: 'project' },
};
const fetchOptions = { timeout: 0 };

describe('Core BFF error response components', () => {
  let fixtureClient: ContractApiClient;
  let fixture: GoTestFixture | undefined;
  let sdkEndpoint = '';

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => null },
      configurable: true,
    });
    fixture = await startGoTestFixture({
      bffDir: resolve(__dirname, '../../../bff'),
      packagePath: './internal/proxy',
      testName: 'TestContractFixtureServer',
    });
    const proxyURL = fixture.url;
    setUtilsConfig({
      wsAppSettings: () => ({ host: 'auto' }),
      appFetch: async (_url, options) => {
        if (sdkEndpoint === '/missing-credentials') {
          return fetch(
            `${
              process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080'
            }/api/k8s/api/v1/namespaces`,
            options,
          );
        }
        return fetch(`${proxyURL}/api/k8s${sdkEndpoint}`, options);
      },
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
    Reflect.deleteProperty(globalThis, 'localStorage');
    await fixture?.stop();
  });

  describe.each([
    { name: 'HTTP proxy', prefix: '/api/k8s', websocket: false },
    { name: 'prefixed HTTP proxy', prefix: '/core-bff/api/k8s', websocket: false },
    { name: 'WebSocket handshake', prefix: '/wss/k8s', websocket: true },
    { name: 'prefixed WebSocket handshake', prefix: '/core-bff/wss/k8s', websocket: true },
  ])('$name', ({ prefix, websocket }) => {
    it.each(kubernetesFailures)(
      'should preserve $status Kubernetes failure semantics',
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
        const responseComponent = websocket ? response : 'K8sProxyFailure';
        expect(error).toMatchContract(apiSchema, {
          ref: `#/components/responses/${responseComponent}/content/application~1json/schema`,
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
          `#/components/responses/${responseComponent}`,
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
            { reason: 'FieldValueRequired', field: 'data', message: 'required field' },
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

    it.each([
      '/api/v1/watch/namespaces/project/secrets',
      '/apis/example.io/v1/watch/namespaces/project/secrets',
      '/api/v1/watch/namespaces/project/secrets?watch=false',
      '/apis/example.io/v1/watch/namespaces/project/secrets?watch=false',
    ])('should sanitize legacy watch ERROR events at %s', async (path) => {
      const { response } = expectSuccess(await fixtureClient.get(`${prefix}${path}`));
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        type: 'ERROR',
        object: { kind: 'Status', code: 410, reason: 'Expired' },
      });
      expect(JSON.stringify(response.data)).not.toContain('CANARY');
    });

    it('should reject an unexpected protobuf watch response before streaming', async () => {
      const error = expectError(
        await fixtureClient.get(`${prefix}/watch?watch=true&media=protobuf`, {
          headers: { Accept: 'application/vnd.kubernetes.protobuf' },
        }),
        502,
      );
      expect(error).toMatchContract(apiSchema, {
        ref: '#/components/responses/K8sProxyFailure/content/application~1json/schema',
        status: 502,
      });
      expect(error.data).toMatchObject({
        kind: 'Status',
        reason: 'DashboardProxyError',
        details: { causes: [{ reason: 'BAD_GATEWAY' }] },
      });
      expect(JSON.stringify(error.data)).not.toContain('CANARY');
    });
  });

  describe.each(['/api/k8s', '/core-bff/api/k8s'])('Protobuf failures through %s', (prefix) => {
    it.each([
      { status: 409, reason: 'AlreadyExists', gzip: false },
      { status: 409, reason: 'AlreadyExists', gzip: true },
      { status: 422, reason: 'Invalid', gzip: false },
      { status: 422, reason: 'Invalid', gzip: true },
      { status: 429, reason: 'TooManyRequests', gzip: false },
      { status: 429, reason: 'TooManyRequests', gzip: true },
    ])('should preserve $status semantics with gzip=$gzip', async ({ status, reason, gzip }) => {
      const error = expectError(
        await fixtureClient.get(`${prefix}/status/${status}?gzip=${gzip}`, {
          headers: { Accept: 'application/vnd.kubernetes.protobuf', 'Accept-Encoding': 'gzip' },
        }),
        status,
      );
      expect(error).toMatchContract(apiSchema, {
        ref: '#/components/responses/K8sProxyFailure/content/application~1json/schema',
        status,
      });
      const body = error.data as KubernetesFailure;
      expect(body).toMatchObject({ kind: 'Status', code: status, reason });
      expect(JSON.stringify(body)).not.toContain('CANARY');
      expect(error.headers?.['content-encoding']).toBeUndefined();
      if (status === 422) {
        expect(body.details?.causes?.[1]).toMatchObject({
          reason: 'FieldValueInvalid',
          field: 'spec.containers[1].image',
          message: 'invalid field value',
        });
      }
      if (status === 429) {
        expect(body.details?.retryAfterSeconds).toBe(7);
        expect(error.headers?.['retry-after']).toBe('7');
      }
    });
  });

  describe.each(['get', 'post', 'put', 'delete', 'patch'] as const)(
    'Model serving %s failures',
    (method) => {
      it.each([
        {
          cause: 'unavailable',
          status: 503,
          response: 'K8sUnavailable',
          message: 'the upstream service is temporarily unavailable',
        },
        {
          cause: 'timeout',
          status: 504,
          response: 'K8sTimeout',
          message: 'the upstream request timed out',
        },
      ])('should document and validate $status', async ({ cause, status, response, message }) => {
        const error = expectError(
          await fixtureClient[method](`/api/service/model-serving/transport/${cause}`, undefined),
          status,
        );
        expect(error.data).toMatchObject({ error: { message } });
        expect(apiSchema).toHaveProperty(
          [
            'paths',
            '/api/service/model-serving/{path}',
            method,
            'responses',
            String(status),
            '$ref',
          ],
          '#/components/responses/ModelServingProxyFailure',
        );
        expect(error).toMatchContract(apiSchema, {
          ref: '#/components/responses/ModelServingProxyFailure/content/application~1json/schema',
          status,
        });
        expect(error).toMatchContract(apiSchema, {
          ref: `#/components/responses/${response}/content/application~1json/schema`,
          status,
        });
      });

      it.each([
        { status: 503, format: 'json' },
        { status: 504, format: 'json' },
        { status: 503, format: 'text' },
        { status: 504, format: 'text' },
      ])('should preserve upstream $status $format responses', async ({ status, format }) => {
        const error = expectError(
          await fixtureClient[method](
            `/api/service/model-serving/upstream-failure/${status}?format=${format}`,
            undefined,
          ),
          status,
        );
        const mediaType = format === 'json' ? 'application~1json' : '*~1*';
        expect(error).toMatchContract(apiSchema, {
          ref: `#/components/responses/ModelServingProxyFailure/content/${mediaType}/schema`,
          status,
        });
        expect(error.headers?.['content-type']).toBe(
          format === 'json' ? 'application/json' : 'text/plain',
        );
        expect(error.data).toEqual(
          format === 'json' ? { detail: 'upstream service failure' } : 'upstream service failure',
        );
      });
    },
  );

  it.each([
    { cause: 'bad-gateway', status: 502, code: 'BAD_GATEWAY' },
    { cause: 'unavailable', status: 503, code: 'SERVICE_UNAVAILABLE' },
    { cause: 'timeout', status: 504, code: 'GATEWAY_TIMEOUT' },
  ])(
    'should classify $cause as a local Kubernetes proxy $status failure',
    async ({ cause, status, code }) => {
      const error = expectError(await fixtureClient.get(`/api/k8s/transport/${cause}`), status);
      const body = error.data as KubernetesFailure;
      expect(body).toMatchObject({ kind: 'Status', code: status, reason: 'DashboardProxyError' });
      expect(body.details?.causes?.[0].reason).toBe(code);
      expect(error.headers?.['x-request-id']).toMatch(uuidV4);
      expect(error.headers?.['audit-id']).toBeUndefined();
      expect(body).not.toHaveProperty('error');
      expect(error).toMatchContract(apiSchema, {
        ref: '#/components/responses/K8sProxyFailure/content/application~1json/schema',
        status,
      });
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
  describe.each([
    { cause: 'bad-gateway', status: 502, code: 'BAD_GATEWAY' },
    { cause: 'unavailable', status: 503, code: 'SERVICE_UNAVAILABLE' },
    { cause: 'timeout', status: 504, code: 'GATEWAY_TIMEOUT' },
  ])('$cause', ({ cause, status, code }) => {
    it.each([
      { operation: 'create', run: () => k8sCreateResource({ model, resource, fetchOptions }) },
      { operation: 'update', run: () => k8sUpdateResource({ model, resource, fetchOptions }) },
      {
        operation: 'delete',
        run: () =>
          k8sDeleteResource({
            model,
            queryOptions: { name: 'example', ns: 'project' },
            fetchOptions,
          }),
      },
    ])('should reject SDK $operation', async ({ run }) => {
      sdkEndpoint = `/transport/${cause}`;
      await expect(run()).rejects.toMatchObject({
        status: {
          kind: 'Status',
          status: 'Failure',
          reason: 'DashboardProxyError',
          code: status,
          details: { causes: [{ reason: code }] },
        },
      });
    });
  });
  it('should reject a missing-credential failure from the production Core BFF route', async () => {
    sdkEndpoint = '/missing-credentials';
    await expect(k8sCreateResource({ model, resource, fetchOptions })).rejects.toMatchObject({
      status: {
        kind: 'Status',
        status: 'Failure',
        reason: 'DashboardProxyError',
        code: 401,
        details: { causes: [{ reason: 'UNAUTHORIZED' }] },
      },
    });
  });

  it.each([
    {
      name: 'validation',
      status: 422,
      reason: 'Invalid',
      safeMessage:
        'request validation failed: spec.replicas: invalid field value; spec.image: required field',
      causes: [
        { reason: 'FieldValueInvalid', field: 'spec.replicas', message: 'invalid field value' },
        { reason: 'FieldValueRequired', field: 'spec.image', message: 'required field' },
      ],
    },
    {
      name: 'webhook',
      status: 403,
      reason: 'Forbidden',
      safeMessage: 'the requested operation is forbidden',
      causes: [],
    },
  ])(
    'should preserve $name failure semantics without upstream-only secrets',
    async ({ name, status, reason, safeMessage, causes }) => {
      sdkEndpoint = `/diagnostics/${name}`;
      await expect(k8sCreateResource({ model, resource, fetchOptions })).rejects.toMatchObject({
        message: safeMessage,
        status: {
          kind: 'Status',
          code: status,
          reason,
          message: safeMessage,
          ...(causes.length ? { details: { causes } } : {}),
        },
      });
    },
  );

  describe('Compatibility with unchanged Kubernetes proxy consumers', () => {
    it.each([
      { name: 'not-found', status: 404, reason: 'NotFound', diagnostic: 'not found' },
      {
        name: 'already-exists',
        status: 409,
        reason: 'AlreadyExists',
        diagnostic: '"example" already exists',
      },
      {
        name: 'validation',
        status: 422,
        reason: 'Invalid',
        diagnostic: 'must be greater than or equal to 0',
      },
      { name: 'quota', status: 403, reason: 'Forbidden', diagnostic: 'limited: requests.cpu=4' },
      {
        name: 'admission',
        status: 403,
        reason: 'Forbidden',
        diagnostic: 'select an approved hardware profile',
      },
    ])(
      'should preserve $name diagnostics through the installed SDK',
      async ({ name, status, reason, diagnostic }) => {
        sdkEndpoint = `/apis/example.io/v1/namespaces/project/widgets/${name}`;
        await expect(
          k8sGetResource({ model, queryOptions: { name: 'example', ns: 'project' }, fetchOptions }),
        ).rejects.toMatchObject({
          message: expect.stringContaining(diagnostic),
          status: { code: status, reason, details: { name: 'example', kind: 'widgets' } },
        });
        if (name === 'not-found') {
          // KServe checks "404"; notification hooks also recognize "not found".
          await expect(
            k8sGetResource({
              model,
              queryOptions: { name: 'example', ns: 'project' },
              fetchOptions,
            }),
          ).rejects.toMatchObject({
            message: expect.stringContaining('404'),
          });
        }
        if (name === 'validation') {
          await expect(k8sCreateResource({ model, resource, fetchOptions })).rejects.toMatchObject({
            status: {
              details: {
                causes: [
                  {
                    reason: 'FieldValueInvalid',
                    field: 'spec.replicas',
                    message: 'must be greater than or equal to 0',
                  },
                ],
              },
            },
          });
        }
      },
    );

    it.each(['/api/k8s', '/core-bff/api/k8s', '/wss/k8s', '/core-bff/wss/k8s'])(
      'should preserve admission diagnostics and names at %s',
      async (prefix) => {
        const websocket = prefix.includes('/wss/');
        const result = await fixtureClient.get(
          `${prefix}/apis/example.io/v1/namespaces/project/widgets/admission`,
          {
            headers: websocket
              ? {
                  Connection: 'Upgrade',
                  Upgrade: 'websocket',
                  'Sec-WebSocket-Version': '13',
                  'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                  Origin: 'https://contract.example',
                }
              : {},
          },
        );
        const error = expectError(result, 403);
        expect(error).toMatchContract(apiSchema, {
          ref: '#/components/schemas/KubernetesStatus',
          status: 403,
        });
        expect(error.data).toMatchObject({
          message: expect.stringContaining('select an approved hardware profile'),
          details: { name: 'example' },
        });
      },
    );
  });
});
