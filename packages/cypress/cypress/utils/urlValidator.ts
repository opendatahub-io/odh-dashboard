/**
 * Test utility to validate HTTP and HTTPS URLs with retry logic and error handling.
 *
 * Node.js-only module - runs as Cypress task in cypress.config.ts.
 * Do not import directly in test files - use urlValidatorShared.ts for browser-safe utilities.
 *
 * Including:
 * - validateHttpsUrls(): Validate multiple URLs with proxy support and retries
 */

import * as http from 'http';
import * as https from 'https';
import { logToConsole, LogLevel } from './logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HttpsProxyAgent: new (options: string | object) => https.Agent = require('https-proxy-agent');

// Re-export browser-safe utilities from shared module
export {
  VALID_STATUS_CODES,
  TRANSIENT_ERROR_CODES,
  PERMANENT_ERROR_CODES,
  getErrorType,
  validateUrlFormat,
} from './urlValidatorShared';

// Result interface for URL validation responses
interface UrlValidationResult {
  url: string;
  originalUrl?: string;
  status: number;
  error?: string;
}

// Common HTTP request configuration
const commonUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const maxRedirects = 5;

// Tiered timeout strategy for different URL types
const TIMEOUT_TIERS = {
  INTERNAL: 10000, // Cluster-adjacent Red Hat domains (*.redhat.com, *.openshift.com)
  NORMAL: 15000, // Most external URLs, including public docs CDNs
  SLOW: 30000, // Known slow services (catalogs, CDNs, etc.)
};

// Domains known to have slower response times
const SLOW_DOMAINS = [
  'catalog.redhat.com', // Red Hat container catalog - often slow from CI
  'quay.io', // Container registry - can be slow
  'registry.redhat.io', // Red Hat registry - can be slow
];

// Public CDN-backed docs hosts. These match INTERNAL_DOMAINS suffixes but are not
// fast internal endpoints; CI 5s INTERNAL timeouts flake on docs.redhat.com.
const EXTERNAL_REDHAT_DOMAINS = ['docs.redhat.com'];

// Internal/fast domains
const INTERNAL_DOMAINS = ['.redhat.com', '.openshift.com', 'redhat.com', 'openshift.com'];

// Determine appropriate timeout based on URL
const getTimeoutForUrl = (url: string): number => {
  // Check if it's a known slow domain
  if (SLOW_DOMAINS.some((domain) => url.includes(domain))) {
    return TIMEOUT_TIERS.SLOW;
  }

  // Public docs.redhat.com is a large external CDN, not an internal service
  if (EXTERNAL_REDHAT_DOMAINS.some((domain) => url.includes(domain))) {
    return TIMEOUT_TIERS.NORMAL;
  }

  // Check if it's an internal domain
  if (INTERNAL_DOMAINS.some((domain) => url.includes(domain))) {
    return TIMEOUT_TIERS.INTERNAL;
  }

  // Default to normal timeout
  return TIMEOUT_TIERS.NORMAL;
};

const maxRetries = 3;
const initialRetryDelay = 1000;

// Standard headers for HTTP requests
const commonHeaders = {
  'User-Agent': commonUserAgent,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  // tells request receiving server that links are coming from a user, helps with link validation
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// Utility function to pause execution for specified milliseconds
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    void setTimeout(resolve, ms);
  });

// Check if an error is retryable based on error codes and messages
const isRetryableError = (error: Error & { code?: string }): boolean => {
  const retryableCodes = ['ENETUNREACH', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
  return (
    retryableCodes.includes(error.code || '') ||
    (!error.code && error.message.includes('timed out'))
  );
};

// 5xx status codes are sometimes transient server and throttling related errors worth retrying
const isRetryableStatusCode = (statusCode: number): boolean =>
  statusCode >= 500 && statusCode < 600;

type HeaderResult = {
  statusCode: number;
  location?: string;
};

const headerLocation = (location: string | string[] | undefined): string | undefined =>
  Array.isArray(location) ? location[0] : location;

/**
 * GET a URL and return only status / Location. Do not download the body.
 * Manifests include GitHub release assets (tens of MB); waiting for `end` on
 * those (or a stalled stream after headers) exceeds Cypress's 60s `cy.task` timeout.
 */
const fetchStatus = (
  urlToTest: string,
  options: http.RequestOptions,
  protocol: typeof http | typeof https,
  requestTimeout: number,
): Promise<HeaderResult> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timeoutState: { timer?: ReturnType<typeof setTimeout> } = {};

    const settle = (cb: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutState.timer) {
        clearTimeout(timeoutState.timer);
      }
      cb();
    };

    const req = protocol.get(urlToTest, options, (res) => {
      const statusCode = res.statusCode || 0;
      const location = headerLocation(res.headers.location);
      // Resolve before destroy() so a sync ECONNRESET from abort is ignored.
      settle(() => resolve({ statusCode, location }));
      res.resume();
      req.destroy();
    });

    timeoutState.timer = setTimeout(() => {
      req.destroy();
      settle(() => reject(new Error(`Request timed out after ${requestTimeout}ms`)));
    }, requestTimeout);

    req.on('error', (err) => {
      settle(() => reject(err));
    });
    req.on('timeout', () => {
      req.destroy();
      settle(() => reject(new Error(`Request timed out after ${requestTimeout}ms`)));
    });
  });

// Make HTTP/HTTPS request with retry logic, redirect handling, and proxy support
const makeRequest = async (
  urlToTest: string,
  proxyUrlFromTask?: string,
  redirectCount = 0,
  retryCount = 0,
  originalUrl?: string,
): Promise<UrlValidationResult> => {
  // Check for maximum redirect limit
  if (redirectCount > maxRedirects) {
    return {
      url: urlToTest,
      originalUrl: originalUrl || urlToTest,
      status: 0,
      error: 'Too many redirects',
    };
  }

  const effectiveOriginalUrl = originalUrl || urlToTest;
  const effectiveProxyUrl = proxyUrlFromTask || process.env.https_proxy || process.env.HTTPS_PROXY;
  const requestTimeout = getTimeoutForUrl(urlToTest);
  let agent: http.Agent | undefined;

  // Setup proxy agent for HTTPS requests if proxy is configured
  if (effectiveProxyUrl && urlToTest.startsWith('https')) {
    try {
      agent = new HttpsProxyAgent(effectiveProxyUrl);
    } catch (e: unknown) {
      return {
        url: urlToTest,
        originalUrl: effectiveOriginalUrl,
        status: 0,
        error: e instanceof Error ? e.message : 'Failed to create proxy agent',
      };
    }
  }

  const protocol = urlToTest.startsWith('https') ? https : http;
  const options: http.RequestOptions = { timeout: requestTimeout, headers: commonHeaders, agent };

  try {
    const { statusCode, location } = await fetchStatus(
      urlToTest,
      options,
      protocol,
      requestTimeout,
    );

    // Handle HTTP redirects (3xx status codes)
    if (statusCode >= 300 && statusCode < 400 && location) {
      try {
        const currentUrl = new URL(urlToTest);
        const nextUrl = new URL(location, currentUrl.origin).toString();
        return await makeRequest(
          nextUrl,
          proxyUrlFromTask,
          redirectCount + 1,
          retryCount,
          effectiveOriginalUrl,
        );
      } catch (e: unknown) {
        return {
          url: urlToTest,
          originalUrl: effectiveOriginalUrl,
          status: 0,
          error: e instanceof Error ? e.message : 'Invalid redirect URL',
        };
      }
    }

    if (isRetryableStatusCode(statusCode) && retryCount < maxRetries) {
      const delay = initialRetryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return await makeRequest(
        urlToTest,
        proxyUrlFromTask,
        redirectCount,
        retryCount + 1,
        effectiveOriginalUrl,
      );
    }

    return { url: urlToTest, originalUrl: effectiveOriginalUrl, status: statusCode };
  } catch (err: unknown) {
    const error = err as Error & { code?: string; errors?: Array<Error & { code?: string }> };

    // Implement exponential backoff retry logic for retryable errors
    if (retryCount < maxRetries && isRetryableError(error)) {
      const delay = initialRetryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return makeRequest(
        urlToTest,
        proxyUrlFromTask,
        redirectCount,
        retryCount + 1,
        effectiveOriginalUrl,
      );
    }

    // Format error message with additional context
    let errorMessage = error.message;
    if (error.code) {
      errorMessage = `Code: ${error.code} - ${error.message}`;
    } else if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
      errorMessage = error.errors
        .map((e) => `(Code: ${e.code || 'N/A'} - ${e.message})`)
        .join('; ');
    }

    return { url: urlToTest, originalUrl: effectiveOriginalUrl, status: 0, error: errorMessage };
  }
};

const CONCURRENCY_LIMIT = 10;

// Validate multiple URLs with proxy support, retries, and concurrency limiting
export async function validateHttpsUrls(
  urls: string[],
  proxyUrlFromTask?: string,
): Promise<UrlValidationResult[]> {
  const uniqueUrls = [...new Set(urls)];
  const results: UrlValidationResult[] = [];

  const batchCount = Math.ceil(uniqueUrls.length / CONCURRENCY_LIMIT);
  logToConsole(
    LogLevel.INFO,
    `validateHttpsUrls: ${uniqueUrls.length} URLs in ${batchCount} batch(es) of ${CONCURRENCY_LIMIT}`,
  );

  for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY_LIMIT) {
    const batch = uniqueUrls.slice(i, i + CONCURRENCY_LIMIT);
    const batchStart = Date.now();
    const batchResults = await Promise.all(batch.map((url) => makeRequest(url, proxyUrlFromTask)));
    results.push(...batchResults);
    logToConsole(
      LogLevel.INFO,
      `validateHttpsUrls: batch ${i / CONCURRENCY_LIMIT + 1}/${batchCount} finished in ${
        Date.now() - batchStart
      }ms`,
    );
  }

  return results;
}
