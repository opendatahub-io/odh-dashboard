/**
 * Content-Security-Policy for the rspack dev server.
 *
 * The policy itself is not defined here. On every document request the dev server
 * reads the policy from the response headers of the document served by the Node
 * backend (normal dev) or by the cluster (`EXT_CLUSTER`), so there is no second copy
 * of the directive list to keep in sync.
 *
 * Development always sends `Content-Security-Policy-Report-Only`: the fetched policy
 * is normalized to the Report-Only header, so violations are still reported — console,
 * dev toast, Segment — without blocking HMR, eval-based source maps or the local API
 * sockets. The declared dev delta below is still applied so the report only contains
 * real regressions instead of known dev-only allowances.
 *
 * See docs/content-security-policy.md.
 */

const http = require('http');
const https = require('https');

const DEFAULT_DEV_PORT = 4010;
const CSP_HEADER_ENFORCE = 'Content-Security-Policy';
const CSP_HEADER_REPORT_ONLY = 'Content-Security-Policy-Report-Only';
const DEV_CSP_HEADER_NAME = CSP_HEADER_REPORT_ONLY;
const CSP_REQUEST_TIMEOUT_MS = 5000;
const FAILURE_LOG_INTERVAL_MS = 60000;

/**
 * The only directives the dev server may widen, and by exactly these tokens.
 * - `'unsafe-eval'` — `eval-source-map` devtool
 * - `ws:` and `http://localhost:<port>` — HMR socket and the local `/api` + `/wss` proxies
 * - `http://localhost:<port>` in `frame-src` — local object storage previews
 */
const buildDevDelta = (port) => ({
  'script-src': ["'unsafe-eval'"],
  'connect-src': ['ws:', `http://localhost:${port}`],
  'frame-src': [`http://localhost:${port}`],
});

/** `default-src 'self'; script-src 'self' https://x` -> `[['default-src', "'self'"], ...]`. */
const parsePolicy = (value) =>
  value
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...tokens] = directive.split(/\s+/);
      return [name, tokens.join(' ')];
    });

const serializePolicy = (directives) =>
  directives.map(([name, value]) => `${name} ${value}`).join('; ');

/**
 * Adds the dev-only tokens to the policy fetched from the backend. Throws when the
 * fetched policy has no directive the dev server needs to widen, so a renamed or
 * removed directive fails loudly instead of silently dropping dev allowances.
 */
const applyDevDelta = (directives, port = DEFAULT_DEV_PORT) => {
  const delta = buildDevDelta(port);
  const merged = directives.map(([name, value]) => [name, value]);

  Object.entries(delta).forEach(([directive, tokens]) => {
    const index = merged.findIndex(([name]) => name === directive);
    if (index === -1) {
      throw new Error(
        `Dev CSP delta targets a directive missing from the served policy: ${directive}`,
      );
    }
    merged[index] = [directive, `${merged[index][1]} ${tokens.join(' ')}`.trim()];
  });

  return merged;
};

const readServedPolicy = (headers) =>
  headers[CSP_HEADER_ENFORCE.toLowerCase()] ??
  headers[CSP_HEADER_REPORT_ONLY.toLowerCase()] ??
  null;

/**
 * Requests only the headers of `source.url`; the document body is discarded. Redirects
 * are followed so an auth or http->https redirect still yields the dashboard document.
 */
const requestPolicy = ({ url, headers = {}, rejectUnauthorized = true }, redirectsLeft = 3) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.request(
      target,
      {
        method: 'GET',
        headers: { accept: 'text/html', ...headers },
        rejectUnauthorized,
        timeout: CSP_REQUEST_TIMEOUT_MS,
      },
      (response) => {
        response.resume();
        const isRedirect = response.statusCode >= 300 && response.statusCode < 400;
        if (isRedirect && response.headers.location && redirectsLeft > 0) {
          resolve(
            requestPolicy(
              {
                url: new URL(response.headers.location, target).toString(),
                headers,
                rejectUnauthorized,
              },
              redirectsLeft - 1,
            ),
          );
          return;
        }
        resolve(response.headers);
      },
    );

    request.on('timeout', () =>
      request.destroy(
        new Error(`CSP request to ${url} timed out after ${CSP_REQUEST_TIMEOUT_MS}ms`),
      ),
    );
    request.on('error', reject);
    request.end();
  });

/**
 * Builds the resolver used for dev-server document responses: fetch the served policy,
 * apply the dev delta, and return it under the Report-Only header name.
 *
 * A failed fetch keeps the last fetched policy; before the first success the document
 * is served without a policy and the failure is logged at most once a minute.
 */
const createCspResolver = ({
  source,
  port = DEFAULT_DEV_PORT,
  fetchPolicy = requestPolicy,
  log = console,
}) => {
  let lastGood = null;
  let lastFailureLogAt = 0;

  return async () => {
    try {
      const served = readServedPolicy(await fetchPolicy(source));
      if (!served) {
        throw new Error('response has no Content-Security-Policy header');
      }
      lastGood = {
        name: DEV_CSP_HEADER_NAME,
        value: serializePolicy(applyDevDelta(parsePolicy(served), port)),
      };
      return lastGood;
    } catch (error) {
      const now = Date.now();
      if (now - lastFailureLogAt >= FAILURE_LOG_INTERVAL_MS) {
        lastFailureLogAt = now;
        const fallback = lastGood
          ? 'reusing the last fetched policy'
          : 'serving documents without a policy';
        log.warn(
          `[CSP] Could not read the policy from ${source.url}: ${error.message}; ${fallback}.`,
        );
      }
      return lastGood;
    }
  };
};

module.exports = {
  DEFAULT_DEV_PORT,
  DEV_CSP_HEADER_NAME,
  parsePolicy,
  serializePolicy,
  buildDevDelta,
  applyDevDelta,
  requestPolicy,
  createCspResolver,
};
