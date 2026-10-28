import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyAgent, proxyCall } from '../httpUtils';
import { ipv6AwareCheckServerIdentity } from '../networkUtils';
import { getDirectCallOptions } from '../directCallUtils';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../types';

jest.mock('https');
jest.mock('http');
jest.mock('../directCallUtils');
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  DEV_MODE: true, // allow the http-target branch of proxyCall to run
}));

describe('getProxyAgent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HTTPS_PROXY: 'http://proxy.example.invalid:3128',
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

  it('should ignore the proxy outside E2E mode', () => {
    delete process.env.E2E_USE_PROXY_FROM_ENV;
    expect(getProxyAgent('https://api.example.test')).toBeUndefined();

    process.env.E2E_USE_PROXY_FROM_ENV = 'false';
    expect(getProxyAgent('https://api.example.test')).toBeUndefined();
  });

  it('should use the proxy for HTTPS targets in E2E mode', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    expect(getProxyAgent('https://api.example.test')).toBeInstanceOf(HttpsProxyAgent);
  });

  it('should honor NO_PROXY in E2E mode', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    process.env.NO_PROXY = 'api.example.test';
    expect(getProxyAgent('https://api.example.test')).toBeUndefined();
  });

  it('should not proxy HTTP targets in E2E mode', () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    expect(getProxyAgent('http://api.example.test')).toBeUndefined();
  });
});

describe('proxyCall', () => {
  const mockHttpsRequest = https.request as jest.Mock;
  const mockHttpRequest = http.request as jest.Mock;
  const mockGetDirectCallOptions = jest.mocked(getDirectCallOptions);

  const fastify = {
    log: { info: jest.fn(), error: jest.fn() },
  } as unknown as KubeFastifyInstance;
  const request = { headers: {} } as unknown as OauthFastifyRequest;

  const originalEnv = process.env;

  // Capture the options the outbound request was built with.
  let capturedOptions: https.RequestOptions | undefined;

  const installRequestMock = (mock: jest.Mock) => {
    mock.mockImplementation((_url, options, callback) => {
      capturedOptions = options;
      const res = new EventEmitter() as unknown as http.IncomingMessage & {
        setEncoding: () => void;
      };
      res.setEncoding = () => res;
      process.nextTick(() => {
        callback(res);
        res.emit('end');
      });
      const req = new EventEmitter() as unknown as EventEmitter & {
        write: () => void;
        end: () => void;
      };
      req.write = jest.fn();
      req.end = jest.fn();
      return req;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOptions = undefined;
    process.env = { ...originalEnv };
    delete process.env.E2E_USE_PROXY_FROM_ENV;
    mockGetDirectCallOptions.mockResolvedValue({ headers: {} });
    installRequestMock(mockHttpsRequest);
    installRequestMock(mockHttpRequest);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should wire the IPv6-aware checkServerIdentity for IPv6 https targets', async () => {
    await proxyCall(fastify, request, { method: 'GET', url: 'https://[fc00:30::1]/api/config' });

    expect(mockHttpsRequest).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.checkServerIdentity).toBe(ipv6AwareCheckServerIdentity);
  });

  it('should not set checkServerIdentity for non-IPv6 (DNS) https targets', async () => {
    await proxyCall(fastify, request, {
      method: 'GET',
      url: 'https://kubernetes.default.svc/api/config',
    });

    expect(mockHttpsRequest).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.checkServerIdentity).toBeUndefined();
  });

  it('should keep the IPv6-aware check on the origin request even when a proxy agent is used', async () => {
    process.env.E2E_USE_PROXY_FROM_ENV = 'true';
    process.env.HTTPS_PROXY = 'http://proxy.example.invalid:3128';

    await proxyCall(fastify, request, { method: 'GET', url: 'https://[fc00:30::1]/api/config' });

    // The agent establishes the TLS session with the origin (CONNECT tunnel), so the identity
    // check applies to the destination host, not the proxy.
    expect(capturedOptions?.agent).toBeInstanceOf(HttpsProxyAgent);
    expect(capturedOptions?.checkServerIdentity).toBe(ipv6AwareCheckServerIdentity);
  });

  it('should not set checkServerIdentity for http targets', async () => {
    await proxyCall(fastify, request, { method: 'GET', url: 'http://localhost:8080/api/config' });

    expect(mockHttpRequest).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.checkServerIdentity).toBeUndefined();
  });
});
