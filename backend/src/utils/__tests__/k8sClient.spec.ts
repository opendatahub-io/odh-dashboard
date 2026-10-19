import * as http from 'http';
import { AddressInfo } from 'net';
import {
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
  PatchStrategy,
  RequiredError,
} from '@kubernetes/client-node';
import { errorHandler, isHttpError } from '../../utils';
import { K8sApiError } from '../k8sApiError';
import { applyE2EProxyFromEnv, createK8sApiClient, JSON_PATCH, MERGE_PATCH } from '../k8sClient';
import golden from './fixtures/clientNode012HttpErrors.json';

/** Kubernetes Status bodies matching the server used to capture the 0.12.3 golden errors. */
const STATUS_BODIES: Record<string, { code: number; body: string; contentType: string }> = {
  e404: {
    code: 404,
    body: JSON.stringify(golden.e404.responseBody),
    contentType: 'application/json',
  },
  e403: {
    code: 403,
    body: JSON.stringify(golden.e403.responseBody),
    contentType: 'application/json',
  },
  e409: {
    code: 409,
    body: JSON.stringify(golden.e409.responseBody),
    contentType: 'application/json',
  },
  e401: {
    code: 401,
    body: JSON.stringify(golden.e401.responseBody),
    contentType: 'application/json',
  },
  e500text: { code: 500, body: 'upstream connect error', contentType: 'text/plain' },
  e503empty: { code: 503, body: '', contentType: 'application/json' },
};

const startStatusServer = (): Promise<http.Server> =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const match = Object.keys(STATUS_BODIES).find((key) => req.url?.includes(`/${key}`));
      if (match) {
        const { code, body, contentType } = STATUS_BODIES[match];
        res.writeHead(code, { 'content-type': contentType });
        res.end(body);
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'ok' } }));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const makeKubeConfig = (server: string): KubeConfig => {
  const kc = new KubeConfig();
  kc.loadFromOptions({
    clusters: [{ name: 'cluster', server, skipTLSVerify: true }],
    users: [{ name: 'user', token: 'test-token' }],
    contexts: [{ name: 'context', cluster: 'cluster', user: 'user' }],
    currentContext: 'context',
  });
  return kc;
};

const legacyShape = (e: K8sApiError) => ({
  name: e.name,
  message: e.message,
  statusCode: e.statusCode,
  body: e.body,
  responseStatusCode: e.response.statusCode,
  responseBody: e.response.body,
  isHttpError: isHttpError(e),
  errorHandler: errorHandler(e),
});

const catchError = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('Expected the call to reject');
    },
    (e: unknown) => e,
  );

describe('createK8sApiClient', () => {
  let server: http.Server;
  let kc: KubeConfig;

  beforeAll(async () => {
    server = await startStatusServer();
    const { port } = server.address() as AddressInfo;
    kc = makeKubeConfig(`http://127.0.0.1:${port}`);
  });

  afterAll(() => {
    server.close();
  });

  it('should return the result of a successful call directly', async () => {
    const coreV1Api = createK8sApiClient(kc, CoreV1Api);
    const result = await coreV1Api.readNamespacedConfigMap({ name: 'ok', namespace: 'ns' });
    expect(result.metadata?.name).toBe('ok');
  });

  it('should return an instance usable as the wrapped API type', () => {
    const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
    expect(customObjectsApi).toBeInstanceOf(CustomObjectsApi);
    expect(typeof customObjectsApi.getNamespacedCustomObject).toBe('function');
  });

  it.each(Object.keys(golden) as (keyof typeof golden)[])(
    'should reproduce the 0.12.3 typed-API error for %s end to end',
    async (key) => {
      const coreV1Api = createK8sApiClient(kc, CoreV1Api);
      const error = await catchError(
        coreV1Api.readNamespacedConfigMap({ name: key, namespace: 'ns' }),
      );
      expect(error).toBeInstanceOf(K8sApiError);
      const g = golden[key];
      expect(legacyShape(error as K8sApiError)).toStrictEqual({
        name: g.name,
        message: g.message,
        statusCode: g.statusCode,
        body: 'body' in g ? g.body : undefined,
        responseStatusCode: g.responseStatusCode,
        responseBody: 'responseBody' in g ? g.responseBody : undefined,
        isHttpError: g.isHttpError,
        errorHandler: g.errorHandler,
      });
    },
  );

  it.each(['e404', 'e403', 'e409', 'e401'] as const)(
    'should expose the full Status on body for CustomObjectsApi %s errors',
    async (key) => {
      const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
      const error = await catchError(
        customObjectsApi.getNamespacedCustomObject({
          group: 'g',
          version: 'v1',
          namespace: 'ns',
          plural: 'things',
          name: key,
        }),
      );
      expect(error).toBeInstanceOf(K8sApiError);
      const e = error as K8sApiError;
      expect(e.statusCode).toBe(golden[key].statusCode);
      expect(e.body).toStrictEqual(golden[key].responseBody);
      expect(e.response.body).toStrictEqual(golden[key].responseBody);
      expect(errorHandler(e)).toBe(golden[key].errorHandler);
    },
  );

  it('should expose the raw text on body for CustomObjectsApi non-JSON errors', async () => {
    const customObjectsApi = createK8sApiClient(kc, CustomObjectsApi);
    const error = await catchError(
      customObjectsApi.getNamespacedCustomObject({
        group: 'g',
        version: 'v1',
        namespace: 'ns',
        plural: 'things',
        name: 'e500text',
      }),
    );
    expect((error as K8sApiError).body).toBe('upstream connect error');
  });

  it('should pass RequiredError through unchanged', async () => {
    const coreV1Api = createK8sApiClient(kc, CoreV1Api);
    const error = await catchError(
      coreV1Api.readNamespacedConfigMap({ name: undefined as unknown as string, namespace: 'ns' }),
    );
    expect(error).toBeInstanceOf(RequiredError);
    expect(isHttpError(error)).toBe(false);
  });

  it('should pass network errors through unchanged', async () => {
    const closed = await startStatusServer();
    const { port } = closed.address() as AddressInfo;
    await new Promise((resolve) => {
      closed.close(resolve);
    });
    const coreV1Api = createK8sApiClient(makeKubeConfig(`http://127.0.0.1:${port}`), CoreV1Api);
    const error = await catchError(
      coreV1Api.readNamespacedConfigMap({ name: 'a', namespace: 'b' }),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect(isHttpError(error)).toBe(false);
  });

  it('should bind methods to the underlying client', async () => {
    const coreV1Api = createK8sApiClient(kc, CoreV1Api);
    const { readNamespacedConfigMap } = coreV1Api;
    const result = await readNamespacedConfigMap({ name: 'ok', namespace: 'ns' });
    expect(result.metadata?.name).toBe('ok');
  });
});

describe('patch helpers', () => {
  const contentTypeOf = (options: typeof MERGE_PATCH): string | undefined => {
    const headers: Record<string, string> = {};
    const request = {
      setHeaderParam: (key: string, value: string) => {
        headers[key] = value;
      },
    };
    options.middleware?.forEach((middleware) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middleware.pre(request as any);
    });
    return headers['Content-Type'];
  };

  it('should select the JSON merge patch content type', () => {
    expect(contentTypeOf(MERGE_PATCH)).toBe(PatchStrategy.MergePatch);
  });

  it('should select the JSON patch content type', () => {
    expect(contentTypeOf(JSON_PATCH)).toBe(PatchStrategy.JsonPatch);
  });
});

describe('applyE2EProxyFromEnv', () => {
  const originalEnv = process.env;
  const SERVER = 'https://api.example.test:6443';
  const PROXY = 'http://proxy.example.invalid:3128';

  const makeConfig = (proxyUrl?: string): KubeConfig => {
    const kc = new KubeConfig();
    kc.loadFromOptions({
      clusters: [
        { name: 'cluster', server: SERVER, skipTLSVerify: false, proxyUrl },
        { name: 'other', server: 'https://other.example.test', skipTLSVerify: false },
      ],
      users: [{ name: 'user', token: 'test-token' }],
      contexts: [{ name: 'context', cluster: 'cluster', user: 'user' }],
      currentContext: 'context',
    });
    return kc;
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HTTPS_PROXY: PROXY,
      https_proxy: '',
      ALL_PROXY: '',
      all_proxy: '',
      NO_PROXY: '',
      no_proxy: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should not change the config outside E2E mode', () => {
    delete process.env.E2E_USE_PROXY_FROM_ENV;
    const kc = makeConfig();
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()?.proxyUrl).toBeUndefined();

    process.env.E2E_USE_PROXY_FROM_ENV = 'false';
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()?.proxyUrl).toBeUndefined();
  });

  it('should set the proxy from the environment in E2E mode', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    const kc = makeConfig();
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()).toStrictEqual(
      expect.objectContaining({ name: 'cluster', server: SERVER, proxyUrl: PROXY }),
    );
    expect(kc.getCurrentContext()).toBe('context');
    expect(kc.getCurrentUser()?.token).toBe('test-token');
    expect(kc.getCluster('other')?.proxyUrl).toBeUndefined();
  });

  it('should propagate the proxy to user-scoped configs built from the current cluster', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    const kc = makeConfig();
    applyE2EProxyFromEnv(kc);
    const cluster = kc.getCurrentCluster();
    expect(cluster).not.toBeNull();
    const userKc = new KubeConfig();
    if (cluster) {
      userKc.loadFromClusterAndUser(cluster, { name: 'u', token: 'user-token' });
    }
    expect(userKc.getCurrentCluster()?.proxyUrl).toBe(PROXY);
  });

  it('should honor NO_PROXY in E2E mode', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    process.env.NO_PROXY = 'api.example.test';
    const kc = makeConfig();
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()?.proxyUrl).toBeUndefined();
  });

  it('should preserve an existing kubeconfig proxy-url', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    const kc = makeConfig('http://kubeconfig-proxy.example.invalid:8080');
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()?.proxyUrl).toBe('http://kubeconfig-proxy.example.invalid:8080');
  });

  it('should not change the config when no proxy is configured', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    process.env.HTTPS_PROXY = '';
    const kc = makeConfig();
    applyE2EProxyFromEnv(kc);
    expect(kc.getCurrentCluster()?.proxyUrl).toBeUndefined();
  });

  it('should do nothing when there is no current cluster', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    const kc = new KubeConfig();
    expect(() => applyE2EProxyFromEnv(kc)).not.toThrow();
  });
});
