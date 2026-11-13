/**
 * Content-Security-Policy for the rspack dev server.
 *
 * The policy itself is not defined here. It is imported from
 * `@odh-dashboard/app-config/security-policy` — the same definition the Node backend
 * serves — so there is no second copy of the directive list to keep in sync and no
 * dependency on a served document or a built artifact.
 *
 * Development always sends `Content-Security-Policy-Report-Only`: violations are still
 * reported — console, dev toast, Segment — without blocking HMR, eval-based source maps
 * or the local API sockets. The declared dev delta below is applied so the report only
 * contains real regressions instead of known dev-only allowances.
 *
 * See docs/content-security-policy.md.
 */

const {
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  serializeContentSecurityPolicy,
} = require('@odh-dashboard/app-config/security-policy');

const DEFAULT_DEV_PORT = 4010;
const DEV_CSP_HEADER_NAME = 'Content-Security-Policy-Report-Only';

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

/**
 * Appends the dev-only tokens to the shipped directives. Throws when a directive the dev
 * server needs to widen is missing, so a renamed or removed directive fails the
 * dev-server start instead of silently dropping dev allowances.
 */
const applyDevDelta = (directives, port) => {
  const delta = buildDevDelta(port);
  const shippedNames = new Set(directives.map(([name]) => name));
  const missing = Object.keys(delta).find((name) => !shippedNames.has(name));
  if (missing) {
    throw new Error(`Dev CSP delta targets a directive missing from the served policy: ${missing}`);
  }

  return directives.map(([name, value]) => [name, [value, ...(delta[name] ?? [])].join(' ')]);
};

/** The pathname of a request, without the query string. */
const requestPath = (req) => String(req.originalUrl ?? req.url ?? '').split(/[?#]/)[0];

/**
 * True when the request path falls under one of the dev server's proxy contexts.
 *
 * String contexts are matched the way the proxy middleware matches them — as path prefixes
 * (`http-proxy-middleware` tests `pathname.indexOf(context) === 0`) — so a path the proxy
 * forwards is never labelled with the dashboard's policy.
 */
const isProxiedPath = (pathname, contexts) =>
  contexts.some((context) => {
    if (context instanceof RegExp) {
      return context.test(pathname);
    }
    return pathname.startsWith(String(context));
  });

/**
 * Dev-server middleware that sets the Report-Only policy on document requests only,
 * matching production where assets carry no policy. Requests the dev server proxies to
 * another server's document (`/mlflow`, `/_mf`, the module proxies) are skipped, because
 * that document belongs to the target server and keeps its own header — the same boundary
 * the Node backend and core-bff draw. The policy is computed once, when the dev server
 * starts — there is nothing to fetch and no failure mode.
 */
const createDevCspMiddleware = (port, proxiedContexts = []) => {
  const policy = serializeContentSecurityPolicy(
    applyDevDelta(CONTENT_SECURITY_POLICY_DIRECTIVES, Number(port) || DEFAULT_DEV_PORT),
  );

  return (req, res, next) => {
    const isDocument =
      (req.method === 'GET' || req.method === 'HEAD') &&
      String(req.headers.accept ?? '').includes('text/html');
    if (isDocument && !isProxiedPath(requestPath(req), proxiedContexts)) {
      res.setHeader(DEV_CSP_HEADER_NAME, policy);
    }
    next();
  };
};

module.exports = { createDevCspMiddleware };
