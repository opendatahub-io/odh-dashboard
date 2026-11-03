import { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingHttpHeaders } from 'http';
import { getCacheControlForStaticFile, isStaticAsset } from './cacheHeaders';

/**
 * Baseline browser security headers applied to every response.
 * Cache-Control is selective: no-store on API paths, filename policy for proxied
 * static assets.
 */
export const REFERRER_POLICY = 'strict-origin-when-cross-origin';
export const X_CONTENT_TYPE_OPTIONS = 'nosniff';
export const CROSS_ORIGIN_OPENER_POLICY = 'same-origin';
export const X_FRAME_OPTIONS = 'DENY';
export const X_DNS_PREFETCH_CONTROL = 'off';
export const CACHE_CONTROL_NO_STORE = 'no-cache, no-store, private, max-age=0, must-revalidate';

const COMMON_SECURITY_HEADERS: ReadonlyArray<[string, string]> = [
  ['X-Content-Type-Options', X_CONTENT_TYPE_OPTIONS],
  ['Cross-Origin-Opener-Policy', CROSS_ORIGIN_OPENER_POLICY],
  ['X-Frame-Options', X_FRAME_OPTIONS],
  ['X-DNS-Prefetch-Control', X_DNS_PREFETCH_CONTROL],
  ['Referrer-Policy', REFERRER_POLICY],
];

/**
 * The only third-party origin the dashboard loads from. It mirrors the hardcoded
 * `cdnURL` / `apiHost` in `packages/analytics/src/initSegment.ts` — the Segment SDK
 * is loaded as a remote script from this origin, and events are sent to it. Update
 * all three constants together if the Segment endpoint ever moves.
 *
 * Analytics is initialized only when tracking is enabled
 * (`disableTracking: false` plus a segment key), but the origin is allowlisted
 * unconditionally so enabling tracking never breaks under an enforcing policy.
 */
export const SEGMENT_TELEMETRY_ORIGIN = 'https://console.redhat.com';

/**
 * `Content-Security-Policy` directives for HTML responses. Each directive and the
 * allowances it makes are explained in `docs/content-security-policy.md`.
 *
 * This list is the source of truth. The dev server does not copy it: it fetches the
 * header from the backend (or the cluster in `EXT_CLUSTER` mode) at runtime. The Go
 * core-bff cannot import TypeScript at runtime, so it keeps one mirror, asserted by
 * `securityHeaders.spec.ts`:
 * - `distributions/core-bff/bff/internal/constants/headers.go`
 */
export const CONTENT_SECURITY_POLICY_DIRECTIVES: ReadonlyArray<readonly [string, string]> = [
  ['default-src', "'self'"],
  ['base-uri', "'self'"],
  ['object-src', "'none'"],
  ['script-src', `'self' ${SEGMENT_TELEMETRY_ORIGIN}`],
  ['style-src', "'self' 'unsafe-inline'"],
  ['img-src', "'self' https: data: blob:"],
  ['font-src', "'self' data:"],
  ['media-src', "'self' https: data: blob:"],
  ['connect-src', `'self' ${SEGMENT_TELEMETRY_ORIGIN}`],
  ['frame-src', "'self' https:"],
  ['form-action', "'self'"],
  ['worker-src', "'self' blob:"],
  ['frame-ancestors', "'none'"],
];

/** Serializes directives into a header value. */
export const serializeContentSecurityPolicy = (
  directives: ReadonlyArray<readonly [string, string]>,
): string => directives.map(([directive, value]) => `${directive} ${value}`).join('; ');

/** Serialized `Content-Security-Policy` header value. */
export const CONTENT_SECURITY_POLICY = serializeContentSecurityPolicy(
  CONTENT_SECURITY_POLICY_DIRECTIVES,
);

export const CSP_HEADER_ENFORCE = 'Content-Security-Policy';
export const CSP_HEADER_REPORT_ONLY = 'Content-Security-Policy-Report-Only';
/** Environment variable that selects the header mode. */
export const CSP_MODE_ENV_VAR = 'CSP_MODE';

export type CspMode = 'enforce' | 'report-only';

/**
 * `report-only` sends `Content-Security-Policy-Report-Only`. `enforce`, unset, or
 * empty sends the enforcing header. Unknown values fail closed to enforcement.
 */
export const resolveCspMode = (raw: string | undefined): CspMode =>
  (raw ?? '').trim().toLowerCase() === 'report-only' ? 'report-only' : 'enforce';

export const resolveCspHeaderName = (mode: CspMode): string =>
  mode === 'report-only' ? CSP_HEADER_REPORT_ONLY : CSP_HEADER_ENFORCE;

/** Reads `CSP_MODE` from the environment. Both serving paths read the same variable. */
export const getCspMode = (): CspMode => resolveCspMode(process.env[CSP_MODE_ENV_VAR]);

/** Code and text suffixes. Fonts and images use {@link isStaticAsset}. */
const LIKELY_CODE_EXT = /\.(?:js|mjs|cjs|css|map|json|wasm|html?|txt)$/i;

const getUrlPath = (url: string): string => url.split('?')[0] || '/';

/** Host API surfaces that should not be stored by shared or browser caches. */
export const isApiPath = (urlPath: string): boolean => {
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    return true;
  }
  return urlPath === '/wss' || urlPath.startsWith('/wss/');
};

const headerValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value ?? '';
};

/** 2xx and 304 keep a filename policy. Every other status must not be stored. */
const forcesNoStoreStatus = (statusCode: number): boolean => {
  if (statusCode === 304) {
    return false;
  }
  return statusCode < 200 || statusCode >= 300;
};

const PRIVATE_CACHE_DIRECTIVE = /(^|,)\s*private\b/;

/** API-like paths proxied under `/_mf/{module}/…` (or rewritten `/api/…`). */
const isModuleFederationProxiedApiPath = (urlPath: string): boolean =>
  /(?:^|\/)api(?:\/|$)/.test(urlPath);

const isLikelyStaticAssetPath = (urlPath: string): boolean =>
  LIKELY_CODE_EXT.test(urlPath) || isStaticAsset(urlPath);

/**
 * Cache-Control for `/_mf` static proxies. Module `proxyService` routes use
 * {@link rewriteNoStoreCacheHeaders} instead.
 * Classifies the pathname only. Upstream no-store wins on every path; upstream
 * private wins only for static assets.
 */
export const resolveStaticProxyCacheControl = (
  url: string,
  upstreamCacheControl?: string | string[],
  statusCode?: number,
): string => {
  if (statusCode !== undefined && forcesNoStoreStatus(statusCode)) {
    return CACHE_CONTROL_NO_STORE;
  }

  const upstream = headerValue(upstreamCacheControl);
  const lower = upstream.toLowerCase();
  if (lower.includes('no-store')) {
    return upstream;
  }

  const pathname = getUrlPath(url);
  if (isModuleFederationProxiedApiPath(pathname) || !isLikelyStaticAssetPath(pathname)) {
    return CACHE_CONTROL_NO_STORE;
  }
  if (PRIVATE_CACHE_DIRECTIVE.test(lower)) {
    return upstream;
  }
  return getCacheControlForStaticFile(pathname);
};

/** Sets the no-store Cache-Control header on a Fastify reply. */
export const setNoStoreCacheHeaders = (reply: FastifyReply): void => {
  reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
};

/** `text/html` with an optional charset, as set by `@fastify/view` and `@fastify/static`. */
export const isHtmlContentType = (value: unknown): boolean => {
  const contentType = Array.isArray(value) ? value[0] : value;
  const mediaType = String(contentType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  return mediaType === 'text/html';
};

/**
 * Sets the CSP on HTML documents only. JSON APIs, static assets, and Module
 * Federation proxy responses are not documents and carry no policy.
 * Must run after the payload content type is known — `onSend` satisfies that.
 * Only the header name depends on the mode; the directive string is byte-identical.
 */
export const applyContentSecurityPolicy = (
  reply: FastifyReply,
  mode: CspMode = getCspMode(),
): void => {
  if (!isHtmlContentType(reply.getHeader('content-type'))) {
    return;
  }
  reply.header(resolveCspHeaderName(mode), CONTENT_SECURITY_POLICY);
};

/**
 * Applies shared browser security headers on normal HTTP replies.
 * Common security headers are set on every response (including static `/*` and `/_mf/`).
 * CSP is set on HTML documents. no-store is applied on host `/api` and `/wss` paths.
 */
export const applySecurityHeaders = (request: FastifyRequest, reply: FastifyReply): void => {
  for (const [name, value] of COMMON_SECURITY_HEADERS) {
    reply.header(name, value);
  }

  applyContentSecurityPolicy(reply);

  if (isApiPath(getUrlPath(request.url))) {
    setNoStoreCacheHeaders(reply);
  }
};

/** Forces no-store on module `proxyService` replies. Those routes are not static assets. */
export const rewriteNoStoreCacheHeaders: FastifyHttpProxyOptions['replyOptions']['rewriteHeaders'] =
  (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
    const next: IncomingHttpHeaders = { ...headers };
    next['cache-control'] = CACHE_CONTROL_NO_STORE;
    return next;
  };

/**
 * Rewrites Cache-Control for `/_mf` static proxies using pathname-based asset
 * classification. Status-aware no-store for redirects and other non-success
 * statuses is applied in {@link staticProxyCacheOnResponse}
 * (rewriteHeaders cannot see the status code).
 */
export const rewriteStaticProxyCacheHeaders: FastifyHttpProxyOptions['replyOptions']['rewriteHeaders'] =
  (headers, request) => {
    const next: IncomingHttpHeaders = { ...headers };
    next['cache-control'] = resolveStaticProxyCacheControl(
      request?.url ?? '/',
      headers['cache-control'],
    );
    return next;
  };

/**
 * After rewriteHeaders, forces no-store for redirects and other non-success statuses.
 * 2xx and 304 keep the header rewriteHeaders already set.
 * Must send the upstream stream when onResponse is set.
 */
export const staticProxyCacheOnResponse: NonNullable<
  FastifyHttpProxyOptions['replyOptions']
>['onResponse'] = (_request, reply, res) => {
  if (forcesNoStoreStatus(res.statusCode)) {
    reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
  }
  reply.send(res.stream);
};
