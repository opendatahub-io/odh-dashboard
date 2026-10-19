import { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingHttpHeaders } from 'http';
import { getCacheControlForStaticFile, isStaticAsset } from './cacheHeaders';

/**
 * Header values shared with OpenShift Console `WithSecurityHeaders`.
 * Cache-Control is selective: no-store on API paths, filename policy for proxied
 * static assets. Console also sends `Pragma: no-cache` and no-store on every response.
 */
export const REFERRER_POLICY = 'strict-origin-when-cross-origin';
export const X_CONTENT_TYPE_OPTIONS = 'nosniff';
export const CROSS_ORIGIN_OPENER_POLICY = 'same-origin';
export const X_FRAME_OPTIONS = 'DENY';
export const X_DNS_PREFETCH_CONTROL = 'off';
export const CACHE_CONTROL_NO_STORE = 'no-cache, no-store, must-revalidate';

const COMMON_SECURITY_HEADERS: ReadonlyArray<[string, string]> = [
  ['X-Content-Type-Options', X_CONTENT_TYPE_OPTIONS],
  ['Cross-Origin-Opener-Policy', CROSS_ORIGIN_OPENER_POLICY],
  ['X-Frame-Options', X_FRAME_OPTIONS],
  ['X-DNS-Prefetch-Control', X_DNS_PREFETCH_CONTROL],
  ['Referrer-Policy', REFERRER_POLICY],
];

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

/**
 * Applies shared browser security headers on normal HTTP replies.
 * Common security headers are set on every response (including static `/*` and `/_mf/`).
 * no-store is applied on host `/api` and `/wss` paths.
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
