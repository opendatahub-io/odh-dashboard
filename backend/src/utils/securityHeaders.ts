import { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingHttpHeaders } from 'http';
import { CONTENT_SECURITY_POLICY } from '@odh-dashboard/app-config/security-policy';
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

/*
 * The policy itself is defined once, in `@odh-dashboard/app-config/security-policy`, so
 * the backend and the dev server cannot drift. The Go core-bff cannot import TypeScript,
 * so it keeps one literal mirror asserted by `securityHeaders.spec.ts`:
 * - `distributions/core-bff/bff/internal/constants/headers.go`
 */

export const CSP_HEADER_ENFORCE = 'Content-Security-Policy';
export const CSP_HEADER_REPORT_ONLY = 'Content-Security-Policy-Report-Only';
/** Environment variable that selects the header mode. */
export const CSP_MODE_ENV_VAR = 'CSP_MODE';

export type CspMode = 'enforce' | 'report-only';

/**
 * `report-only` sends `Content-Security-Policy-Report-Only`; `enforce` sends the
 * enforcing header; unknown values fail closed to enforcement.
 *
 * TEMPORARY: unset or empty now resolves to
 * `report-only` instead of `enforce`, so a deployment that does not set CSP_MODE
 * reports violations instead of blocking them. Revert the empty-string branch to
 * `enforce` once the violation baseline is captured.
 */
export const resolveCspMode = (raw: string | undefined): CspMode => {
  const value = (raw ?? '').trim().toLowerCase();
  return value === '' || value === 'report-only' ? 'report-only' : 'enforce';
};

export const resolveCspHeaderName = (mode: CspMode): string =>
  mode === 'report-only' ? CSP_HEADER_REPORT_ONLY : CSP_HEADER_ENFORCE;

/** Reads `CSP_MODE` from the environment. Both serving paths read the same variable. */
export const getCspMode = (): CspMode => resolveCspMode(process.env[CSP_MODE_ENV_VAR]);

/**
 * True when `CSP_MODE` is unset, empty, or whitespace-only: the TEMPORARY case where the
 * header mode falls back to Report-Only without an explicit operator choice. Startup logs a
 * warning so that fallback is visible instead of silent.
 */
export const isImplicitCspReportOnly = (raw: string | undefined): boolean =>
  (raw ?? '').trim() === '';

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
 * Sets the CSP on HTML documents only. JSON APIs and static assets carry no policy.
 * Must run after the payload content type is known — `onSend` satisfies that.
 * Only the header name depends on the mode; the directive string is byte-identical.
 *
 * Called from the SPA route (`routes/root.ts`), the only place this server renders a
 * document of its own. It is not part of {@link applySecurityHeaders}, so a module proxy
 * reply that happens to be HTML keeps the upstream UI's headers rather than receiving the
 * dashboard policy.
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
 * Applies the browser security headers that belong on every response: the common headers on
 * every reply (including static `/*` and `/_mf/`), and no-store on host `/api` and `/wss`
 * paths.
 *
 * The CSP is not applied here. It protects only the documents this server renders itself,
 * so it lives in the route that serves them (`routes/root.ts`); proxied upstream documents
 * (module `proxyService` replies) and JSON APIs do not receive it.
 */
export const applySecurityHeaders = (request: FastifyRequest, reply: FastifyReply): void => {
  for (const [name, value] of COMMON_SECURITY_HEADERS) {
    reply.header(name, value);
  }

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
