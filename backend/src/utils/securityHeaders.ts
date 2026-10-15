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

const getUrlPath = (url: string): string => url.split('?')[0] || '/';

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

export const rewriteStaticFilesNoStoreCacheHeaders: FastifyHttpProxyOptions['replyOptions']['rewriteHeaders'] =
  (headers, request) => {
    const next: IncomingHttpHeaders = { ...headers };
    next['cache-control'] = getCacheControlForStaticFile(request.url);
    return next;
  };
