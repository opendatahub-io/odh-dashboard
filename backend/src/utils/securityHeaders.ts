import { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingHttpHeaders } from 'http';
import { getCacheControlForStaticFile } from './cacheHeaders';

/** Matches OpenShift Console `WithSecurityHeaders` wire values. */
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

/** Extensions treated as static assets for Module Federation `/_mf` proxy cache policy. */
const LIKELY_STATIC_EXT =
  /\.(?:js|mjs|cjs|css|map|json|wasm|html?|txt|woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i;

const getUrlPath = (url: string): string => url.split('?')[0] || '/';

const headerValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value ?? '';
};

const isNonSuccessStatus = (statusCode: number): boolean => statusCode < 200 || statusCode >= 300;

/** True when upstream already forbids shared/browser storage. */
export const isRestrictiveCacheControl = (value: string | string[] | undefined): boolean => {
  const lower = headerValue(value).toLowerCase();
  return lower.includes('no-store') || /(^|,)\s*private\b/.test(lower);
};

/** API-like paths proxied under `/_mf/{module}/…` (or rewritten `/api/…`). */
const isModuleFederationProxiedApiPath = (urlPath: string): boolean =>
  /(?:^|\/)api(?:\/|$)/.test(urlPath);

const isLikelyStaticAssetPath = (urlPath: string): boolean => LIKELY_STATIC_EXT.test(urlPath);

/**
 * Cache-Control for Module Federation static proxies (`/_mf/…`).
 * Classifies the pathname only (never the query string). Preserves upstream
 * no-store/private. Forces no-store for non-2xx, API-like paths, and non-asset paths.
 */
export const resolveStaticProxyCacheControl = (
  url: string,
  upstreamCacheControl?: string | string[],
  statusCode?: number,
): string => {
  if (statusCode !== undefined && isNonSuccessStatus(statusCode)) {
    return CACHE_CONTROL_NO_STORE;
  }
  const upstream = headerValue(upstreamCacheControl);
  if (isRestrictiveCacheControl(upstream)) {
    return upstream;
  }
  const pathname = getUrlPath(url);
  if (isModuleFederationProxiedApiPath(pathname) || !isLikelyStaticAssetPath(pathname)) {
    return CACHE_CONTROL_NO_STORE;
  }
  return getCacheControlForStaticFile(pathname);
};

/** Host API surfaces that should not be stored by shared/browser caches. */
export const isApiPath = (urlPath: string): boolean => {
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    return true;
  }
  return urlPath === '/wss' || urlPath.startsWith('/wss/');
};

/** Sets the no-store Cache-Control header on a Fastify reply. */
export const setNoStoreCacheHeaders = (reply: FastifyReply): void => {
  reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
};

/**
 * Applies Console-equivalent browser security headers on normal HTTP replies.
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

export const rewriteNoStoreCacheHeaders: FastifyHttpProxyOptions['replyOptions']['rewriteHeaders'] =
  (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
    const next: IncomingHttpHeaders = { ...headers };
    next['cache-control'] = CACHE_CONTROL_NO_STORE;
    return next;
  };

/**
 * Rewrites Cache-Control for `/_mf` static proxies using pathname-based asset
 * classification. Status-aware no-store for errors is applied in
 * {@link staticProxyCacheOnResponse} (rewriteHeaders cannot see the status code).
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
 * Forces no-store on non-2xx `/_mf` proxy responses after rewriteHeaders runs.
 * Must send the upstream stream when onResponse is set.
 */
export const staticProxyCacheOnResponse: NonNullable<
  FastifyHttpProxyOptions['replyOptions']
>['onResponse'] = (_request, reply, res) => {
  if (isNonSuccessStatus(res.statusCode)) {
    reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
  }
  reply.send(res.stream);
};
