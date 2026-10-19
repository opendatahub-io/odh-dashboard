import * as http from 'http';
import { AddressInfo } from 'net';
import {
  BatchV1Api,
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
  RbacAuthorizationV1Api,
} from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../types';
import * as constants from '../utils/constants';
import { errorHandler, isHttpError } from '../utils';
import { getDirectCallOptions } from '../utils/directCallUtils';
import { K8sApiError } from '../utils/k8sApiError';
import {
  applyE2EProxyFromEnv,
  createK8sApiClient,
  JSON_PATCH,
  MERGE_PATCH,
} from '../utils/k8sClient';
import { rolloutDeployment } from '../utils/deployment';
import { getConfigMap } from '../utils/envUtils';

/**
 * Exercises the real @kubernetes/client-node 2.x clients (through createK8sApiClient) against a
 * local HTTP server, asserting what goes over the wire and how responses and errors come back.
 */

type RecordedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
};

type Reply = { status: number; body?: string; contentType?: string };

const SA_TOKEN = 'service-account-token';

const startServer = (
  respond: (req: RecordedRequest) => Reply,
): Promise<{ server: http.Server; requests: RecordedRequest[]; url: string }> =>
  new Promise((resolve) => {
    const requests: RecordedRequest[] = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const recorded: RecordedRequest = {
          method: req.method ?? '',
          url: req.url ?? '',
          headers: req.headers,
          body,
        };
        requests.push(recorded);
        const reply = respond(recorded);
        res.writeHead(reply.status, { 'content-type': reply.contentType ?? 'application/json' });
        res.end(reply.body ?? '');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, requests, url: `http://127.0.0.1:${port}` });
    });
  });

const makeKubeConfig = (server: string): KubeConfig => {
  const kc = new KubeConfig();
  kc.loadFromOptions({
    clusters: [{ name: 'cluster', server, skipTLSVerify: true }],
    users: [{ name: 'sa', token: SA_TOKEN }],
    contexts: [{ name: 'context', cluster: 'cluster', user: 'sa' }],
    currentContext: 'context',
  });
  return kc;
};

const closeServer = (server: http.Server): Promise<void> =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

describe('@kubernetes/client-node 2.x integration', () => {
  let server: http.Server;
  let requests: RecordedRequest[];
  let kc: KubeConfig;

  const okObject = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'ok' }, ...extra });

  beforeAll(async () => {
    const started = await startServer((req) => {
      if (req.url.includes('/missing')) {
        return {
          status: 404,
          body: JSON.stringify({
            kind: 'Status',
            apiVersion: 'v1',
            metadata: {},
            status: 'Failure',
            message: 'configmaps "missing" not found',
            reason: 'NotFound',
            code: 404,
          }),
        };
      }
      if (req.url.includes('/conflict')) {
        return {
          status: 409,
          body: JSON.stringify({
            kind: 'Status',
            apiVersion: 'v1',
            metadata: {},
            status: 'Failure',
            message: 'already exists',
            reason: 'AlreadyExists',
            code: 409,
          }),
        };
      }
      if (req.url.includes('/selfsubjectreviews')) {
        return { status: 201, body: req.body };
      }
      return {
        status: 200,
        body: okObject({ echoedBody: req.body ? JSON.parse(req.body) : null }),
      };
    });
    ({ server, requests } = started);
    kc = makeKubeConfig(started.url);
  });

  beforeEach(() => {
    requests.length = 0;
  });

  afterAll(async () => {
    await closeServer(server);
  });

  describe('requests', () => {
    it('should send method, path, query and auth for a typed read', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      const result = await coreV1Api.readNamespacedConfigMap({ name: 'cm', namespace: 'ns' });

      expect(result.metadata?.name).toBe('ok');
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('/api/v1/namespaces/ns/configmaps/cm');
      expect(requests[0].headers.authorization).toBe(`Bearer ${SA_TOKEN}`);
    });

    it('should send list query parameters (labelSelector, continue, limit)', async () => {
      const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
      await customObjectsApi.listNamespacedCustomObject({
        group: 'g.example.com',
        version: 'v1',
        namespace: 'ns',
        plural: 'things',
        labelSelector: 'a=b',
        _continue: 'token',
        limit: 250,
      });

      const url = new URL(requests[0].url, 'http://localhost');
      expect(url.pathname).toBe('/apis/g.example.com/v1/namespaces/ns/things');
      expect(url.searchParams.get('labelSelector')).toBe('a=b');
      expect(url.searchParams.get('continue')).toBe('token');
      expect(url.searchParams.get('limit')).toBe('250');
    });

    it('should send cluster-scoped list requests with fieldSelector', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      await coreV1Api.listServiceForAllNamespaces({ fieldSelector: 'metadata.name=svc' });

      const url = new URL(requests[0].url, 'http://localhost');
      expect(url.pathname).toBe('/api/v1/services');
      expect(url.searchParams.get('fieldSelector')).toBe('metadata.name=svc');
    });

    it('should send dryRun on create', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      await coreV1Api.createNamespacedSecret({
        namespace: 'ns',
        body: { metadata: { name: 's' }, data: { k: 'dg==' } },
        dryRun: 'All',
      });

      const url = new URL(requests[0].url, 'http://localhost');
      expect(requests[0].method).toBe('POST');
      expect(url.pathname).toBe('/api/v1/namespaces/ns/secrets');
      expect(url.searchParams.get('dryRun')).toBe('All');
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(JSON.parse(requests[0].body)).toEqual({
        metadata: { name: 's' },
        data: { k: 'dg==' },
      });
    });

    it('should serialise custom-object bodies untouched, including string timestamps', async () => {
      const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
      const body = {
        apiVersion: 'g.example.com/v1',
        kind: 'Thing',
        metadata: { name: 't', annotations: { stoppedAt: '2026-01-01T00:00:00Z' } },
        spec: { unknownField: { nested: [1, 2] } },
      };
      await customObjectsApi.createNamespacedCustomObject({
        group: 'g.example.com',
        version: 'v1',
        namespace: 'ns',
        plural: 'things',
        body,
      });

      expect(JSON.parse(requests[0].body)).toEqual(body);
    });

    it('should send merge patches with the merge-patch content type and keep null values', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      await coreV1Api.patchNamespace(
        { name: 'ns', body: { metadata: { labels: { remove: null, add: 'x' } } } },
        MERGE_PATCH,
      );

      expect(requests[0].method).toBe('PATCH');
      expect(requests[0].url).toBe('/api/v1/namespaces/ns');
      expect(requests[0].headers['content-type']).toBe('application/merge-patch+json');
      expect(JSON.parse(requests[0].body)).toEqual({
        metadata: { labels: { remove: null, add: 'x' } },
      });
    });

    it('should send JSON patches with the json-patch content type', async () => {
      const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
      const patch = [{ op: 'replace', path: '/metadata/labels/a', value: 'b' }];
      await customObjectsApi.patchNamespacedCustomObject(
        {
          group: 'template.openshift.io',
          version: 'v1',
          namespace: 'ns',
          plural: 'templates',
          name: 't',
          body: patch,
        },
        JSON_PATCH,
      );

      expect(requests[0].url).toBe('/apis/template.openshift.io/v1/namespaces/ns/templates/t');
      expect(requests[0].headers['content-type']).toBe('application/json-patch+json');
      expect(JSON.parse(requests[0].body)).toEqual(patch);
    });

    it('should send merge patches with dryRun for typed secrets', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      await coreV1Api.patchNamespacedSecret(
        { name: 's', namespace: 'ns', body: { data: { k: 'dg==' } }, dryRun: 'All' },
        MERGE_PATCH,
      );

      const url = new URL(requests[0].url, 'http://localhost');
      expect(url.pathname).toBe('/api/v1/namespaces/ns/secrets/s');
      expect(url.searchParams.get('dryRun')).toBe('All');
      expect(requests[0].headers['content-type']).toBe('application/merge-patch+json');
    });

    it('should reach the batch and RBAC APIs', async () => {
      const batchV1Api = createK8sApiClient(kc, BatchV1Api);
      const rbac = createK8sApiClient(kc, RbacAuthorizationV1Api);
      await batchV1Api.readNamespacedJobStatus({ name: 'job', namespace: 'ns' });
      await rbac.createNamespacedRoleBinding({
        namespace: 'ns',
        body: { metadata: { name: 'rb' }, roleRef: { apiGroup: '', kind: 'Role', name: 'r' } },
      });

      expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
        'GET /apis/batch/v1/namespaces/ns/jobs/job/status',
        'POST /apis/rbac.authorization.k8s.io/v1/namespaces/ns/rolebindings',
      ]);
    });
  });

  describe('migrated helpers', () => {
    const makeFastify = () =>
      ({
        kube: {
          config: kc,
          coreV1Api: createK8sApiClient(kc, CoreV1Api),
          customObjectsApi: createK8sApiClient(kc, CustomObjectsApi),
        },
        log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
      } as unknown as KubeFastifyInstance);

    it('should return the resource directly from getConfigMap', async () => {
      const result = await getConfigMap(makeFastify(), 'ns', 'cm');
      expect(result.metadata?.name).toBe('ok');
      expect(requests[0].url).toBe('/api/v1/namespaces/ns/configmaps/cm');
    });

    it('should roll out a deployment with a merge patch', async () => {
      await rolloutDeployment(makeFastify(), 'ns', 'dep');

      expect(requests[0].method).toBe('PATCH');
      expect(requests[0].url).toBe('/apis/apps/v1/namespaces/ns/deployments/dep');
      expect(requests[0].headers['content-type']).toBe('application/merge-patch+json');
      expect(JSON.parse(requests[0].body)).toEqual({
        spec: {
          template: {
            metadata: {
              annotations: { 'kubectl.kubernetes.io/restartedAt': expect.any(String) },
              labels: { 'opendatahub.io/dashboard': 'true' },
            },
          },
        },
      });
    });

    it('should build direct-call headers from the kubeconfig', async () => {
      const { headers } = await getDirectCallOptions(
        makeFastify(),
        { headers: { 'x-forwarded-access-token': 'user-token' } } as never,
        'https://k8s.example.test/api/v1/pods',
      );
      expect(headers).toEqual({ Authorization: 'Bearer user-token' });
    });

    it('should use the kubeconfig auth headers in dev mode without a forwarded token', async () => {
      jest.replaceProperty(constants, 'DEV_MODE', true);
      try {
        const { headers } = await getDirectCallOptions(
          makeFastify(),
          { headers: {} } as never,
          'https://k8s.example.test/api/v1/pods',
        );
        expect(headers).toEqual({ Authorization: `Bearer ${SA_TOKEN}` });
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('errors', () => {
    it('should map a typed-API 404 to the legacy HttpError shape', async () => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      const error = await coreV1Api
        .readNamespacedConfigMap({ name: 'missing', namespace: 'ns' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(K8sApiError);
      expect(isHttpError(error)).toBe(true);
      const e = error as K8sApiError;
      expect(e.statusCode).toBe(404);
      expect(e.response.statusCode).toBe(404);
      expect(e.body).toEqual({ apiVersion: 'v1', kind: 'Status', metadata: {} });
      expect(errorHandler(e)).toBe('configmaps "missing" not found');
    });

    it('should map a custom-object 409 with the full Status on body', async () => {
      const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
      const error = await customObjectsApi
        .createNamespacedCustomObject({
          group: 'g.example.com',
          version: 'v1',
          namespace: 'conflict',
          plural: 'things',
          body: {},
        })
        .catch((e: unknown) => e);

      const e = error as K8sApiError;
      expect(e.statusCode).toBe(409);
      expect(e.body).toEqual(expect.objectContaining({ message: 'already exists', code: 409 }));
      expect(errorHandler(e)).toBe('already exists');
    });
  });
});

describe('E2E proxy from environment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should route client requests through the environment proxy when E2E_USE_PROXY_FROM_ENV=true', async () => {
    // The "proxy" receives absolute-form request targets for plain-HTTP upstreams.
    const proxy = await startServer(() => ({
      status: 200,
      body: JSON.stringify({ metadata: { name: 'via-proxy' } }),
    }));
    const upstream = 'http://k8s-api.example.invalid:6443';
    process.env = {
      ...originalEnv,
      E2E_USE_PROXY_FROM_ENV: 'true',
      HTTP_PROXY: proxy.url,
      http_proxy: '',
      HTTPS_PROXY: '',
      https_proxy: '',
      ALL_PROXY: '',
      all_proxy: '',
      NO_PROXY: '',
      no_proxy: '',
    };
    try {
      const kc = makeKubeConfig(upstream);
      applyE2EProxyFromEnv(kc);
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      const result = await coreV1Api.readNamespacedConfigMap({ name: 'cm', namespace: 'ns' });

      expect(result.metadata?.name).toBe('via-proxy');
      expect(proxy.requests).toHaveLength(1);
      expect(proxy.requests[0].url).toBe(`${upstream}/api/v1/namespaces/ns/configmaps/cm`);
      expect(proxy.requests[0].headers.authorization).toBe(`Bearer ${SA_TOKEN}`);
    } finally {
      await closeServer(proxy.server);
    }
  });
});
