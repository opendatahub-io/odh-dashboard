/* eslint-disable camelcase */
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getHttpsProxyAgent, redactProxyDetails, shouldBypassProxy } from '../proxyAgent';

const PROXY_URL = 'http://proxy.example.test:3128';
const jestExpect = expect as unknown as jest.Expect;

describe('getHttpsProxyAgent', () => {
  it('uses HTTPS_PROXY for an HTTPS target', () => {
    const agent = getHttpsProxyAgent('https://dashboard.example.test', {
      HTTPS_PROXY: PROXY_URL,
    });
    jestExpect(agent).toBeInstanceOf(HttpsProxyAgent);
  });

  it('supports lowercase proxy environment variables', () => {
    const agent = getHttpsProxyAgent('https://dashboard.example.test', {
      https_proxy: PROXY_URL,
    });
    jestExpect(agent).toBeInstanceOf(HttpsProxyAgent);
  });

  it('prefers the uppercase proxy variable and caches its agent', () => {
    const environment = { HTTPS_PROXY: PROXY_URL, https_proxy: 'not-a-valid-url' };
    const firstAgent = getHttpsProxyAgent('https://dashboard.example.test', environment);
    const secondAgent = getHttpsProxyAgent('https://other.example.test', environment);
    jestExpect(firstAgent).toBe(secondAgent);
  });

  it('honors uppercase and lowercase NO_PROXY variables', () => {
    jestExpect(
      getHttpsProxyAgent('https://dashboard.example.test', {
        HTTPS_PROXY: PROXY_URL,
        NO_PROXY: '.example.test',
      }),
    ).toBeUndefined();
    jestExpect(
      getHttpsProxyAgent('https://dashboard.example.test', {
        HTTPS_PROXY: PROXY_URL,
        no_proxy: 'dashboard.example.test',
      }),
    ).toBeUndefined();
  });

  it('does not proxy HTTP targets', () => {
    const agent = getHttpsProxyAgent('http://localhost:4000', { HTTPS_PROXY: PROXY_URL });
    jestExpect(agent).toBeUndefined();
  });

  it('does not expose a malformed proxy URL in its error', () => {
    const secret = 'a-secret-password';
    let thrownError: unknown;
    try {
      getHttpsProxyAgent('https://dashboard.example.test', {
        HTTPS_PROXY: `not-a-url-${secret}`,
      });
    } catch (error: unknown) {
      thrownError = error;
    }
    jestExpect(thrownError).toEqual(new Error('Invalid HTTPS_PROXY configuration'));
    jestExpect((thrownError as Error).message).not.toContain(secret);
  });
});

describe('shouldBypassProxy', () => {
  it('matches exact hosts but not their subdomains', () => {
    jestExpect(
      shouldBypassProxy(new URL('https://dashboard.example.test'), 'dashboard.example.test'),
    ).toBe(true);
    jestExpect(
      shouldBypassProxy(new URL('https://child.dashboard.example.test'), 'dashboard.example.test'),
    ).toBe(false);
  });

  it('matches suffixes only at a hostname boundary', () => {
    jestExpect(shouldBypassProxy(new URL('https://dashboard.redhat.com'), '.redhat.com')).toBe(
      true,
    );
    jestExpect(shouldBypassProxy(new URL('https://dashboard.ibm.com'), '*.ibm.com')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://evilredhat.com'), '.redhat.com')).toBe(false);
  });

  it('honors optional ports and wildcard bypass', () => {
    jestExpect(
      shouldBypassProxy(new URL('https://dashboard.example.test'), 'dashboard.example.test:443'),
    ).toBe(true);
    jestExpect(
      shouldBypassProxy(
        new URL('https://dashboard.example.test:8443'),
        'dashboard.example.test:443',
      ),
    ).toBe(false);
    jestExpect(shouldBypassProxy(new URL('https://dashboard.example.test'), '*')).toBe(true);
  });

  it('matches literal IPv4 targets against CIDR entries without DNS resolution', () => {
    jestExpect(shouldBypassProxy(new URL('https://10.20.30.40'), '10.0.0.0/8')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://172.20.30.40'), '172.16.0.0/12')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://10.20.30.40'), '10.20.30.40/32')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://203.0.113.5'), '0.0.0.0/0')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://10.20.30.40'), '10.0.0.0/33')).toBe(false);
    jestExpect(shouldBypassProxy(new URL('https://dashboard.example.test'), '10.0.0.0/8')).toBe(
      false,
    );
  });

  it('matches literal IPv6 addresses exactly', () => {
    jestExpect(shouldBypassProxy(new URL('https://[::1]'), '[::1]')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://[::2]'), '[::1]')).toBe(false);
    jestExpect(shouldBypassProxy(new URL('https://[::1]'), '[::1]:443')).toBe(true);
    jestExpect(shouldBypassProxy(new URL('https://[::1]:8443'), '[::1]:443')).toBe(false);
    jestExpect(shouldBypassProxy(new URL('https://[::1]'), '[::1]:invalid')).toBe(false);
  });
});

describe('redactProxyDetails', () => {
  it('masks the configured proxy URL, credentials, and hostname', () => {
    const proxyUrl = 'http://runner:password@proxy.example.test:3128';
    const redacted = redactProxyDetails(
      `connect ${proxyUrl} failed; getaddrinfo proxy.example.test`,
      { HTTPS_PROXY: proxyUrl },
    );
    jestExpect(redacted).toContain('[redacted proxy]');
    jestExpect(redacted).not.toContain('password');
    jestExpect(redacted).not.toContain('proxy.example.test');
  });
});
