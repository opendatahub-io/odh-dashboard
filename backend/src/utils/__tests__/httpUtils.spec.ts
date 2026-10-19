import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyAgent } from '../httpUtils';

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
