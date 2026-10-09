/** @jest-environment node */
const { execSync } = require('child_process');

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('../rspack.common', () => () => ({}));
jest.mock('rspack-merge', () => ({ merge: (...configs) => Object.assign({}, ...configs) }));
jest.mock('ts-checker-rspack-plugin', () => ({ TsCheckerRspackPlugin: class {} }));

const originalEnv = process.env;
const loadProxy = () => {
  let proxy;
  jest.isolateModules(() => {
    proxy = require('../rspack.dev').devServer.proxy;
  });
  return proxy;
};

const rewrite = (proxy, request) =>
  Object.entries(proxy.pathRewrite || {}).reduce(
    (url, [pattern, replacement]) => url.replace(new RegExp(pattern), replacement),
    request,
  );

describe('portal development proxy', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_TOKEN: 'test-token',
      EXT_CLUSTER: 'true',
      OC_PROJECT: 'redhat-ods-applications',
      ODH_DASHBOARD_HOST: 'gateway.example.test',
      DEV_LEGACY: '',
      ODH_DASHBOARD_CA_FILE: '',
    };
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.mocked(execSync).mockImplementation(() => {
      throw new Error('core dashboard removed');
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should preserve the portal route when the core dashboard is removed', () => {
    const [proxy] = loadProxy();
    for (const path of [
      '/perses/api/api/v1/dashboards',
      '/api/k8s/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '/api/operator-subscription-status',
      '/wss/k8s/api/v1/pods',
    ]) {
      const request = `/maas-consumer-portal${path}`;
      expect(rewrite(proxy, request)).toBe(request);
    }
    expect(proxy.ws).toBe(true);
    expect(proxy.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('should discover the portal HTTPRoute without the core operand', () => {
    process.env.ODH_DASHBOARD_HOST = '';
    jest.mocked(execSync).mockImplementation((command) => {
      if (command.includes('get httproutes')) {
        expect(command).toContain('maas-portal');
        return Buffer.from(
          JSON.stringify({
            status: {
              parents: [{ parentRef: { name: 'gateway', namespace: 'openshift-ingress' } }],
            },
          }),
        );
      }
      if (command.includes('get gateway')) {
        return Buffer.from(
          JSON.stringify({
            spec: { listeners: [{ name: 'https', hostname: 'portal.example.test' }] },
          }),
        );
      }
      if (command.includes('get deployment')) {
        expect(command).toBe('oc get deployment -n redhat-ods-applications maas-portal -o json');
        return Buffer.from(JSON.stringify({ spec: { template: { spec: { containers: [] } } } }));
      }
      throw new Error('deployment unavailable');
    });
    const [proxy] = loadProxy();
    expect(proxy.target).toBe('https://portal.example.test');
    expect(rewrite(proxy, '/maas-consumer-portal/api/k8s/api/v1/pods')).toBe(
      '/maas-consumer-portal/api/k8s/api/v1/pods',
    );
    expect(execSync).toHaveBeenCalledWith(
      'oc get deployment -n redhat-ods-applications maas-portal -o json',
      expect.any(Object),
    );
  });

  it('should retain the root dashboard proxy as an explicit legacy option', () => {
    process.env.DEV_LEGACY = 'true';
    const [proxy] = loadProxy();
    expect(rewrite(proxy, '/maas-consumer-portal/perses/api/api/v1/dashboards')).toBe(
      '/perses/api/api/v1/dashboards',
    );
    expect(proxy.headers['x-forwarded-access-token']).toBe('test-token');
  });

  it('should proxy local WebSocket upgrades to the Core BFF with authentication', () => {
    process.env.EXT_CLUSTER = '';
    process.env.OC_PROJECT = '';
    process.env.CORE_BFF_TARGET = 'http://localhost:8082';
    const proxy = loadProxy().find((entry) =>
      entry.context.includes('/maas-consumer-portal/wss/k8s'),
    );
    expect(proxy.ws).toBe(true);
    expect(proxy.target).toBe('http://localhost:8082');
    expect(rewrite(proxy, '/maas-consumer-portal/wss/k8s/api/v1/pods?watch=true')).toBe(
      '/wss/k8s/api/v1/pods?watch=true',
    );
    const setHeader = jest.fn();
    proxy.on.proxyReqWs({ setHeader });
    expect(setHeader).toHaveBeenCalledWith('x-forwarded-access-token', 'test-token');
  });
});
