/**
 * URL Validator Module
 *
 * This module provides functionality to validate HTTPS URLs by making HTTP requests
 * and handling various response scenarios including redirects, timeouts, and errors.
 * It supports proxy configuration and provides detailed status information for each URL.
 *
 * The module includes a retry mechanism for network-related errors with exponential backoff:
 * - Maximum of 3 retry attempts
 * - Initial retry delay of 1 second, doubling with each retry (1s, 2s, 4s)
 * - Retries on specific network errors: ENETUNREACH, ECONNRESET, ETIMEDOUT, ECONNREFUSED
 */

import * as http from 'http';
import * as https from 'https';
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-extraneous-dependencies
const HttpsProxyAgent: new (options: string | object) => https.Agent = require('https-proxy-agent');

/** Common user agent string used for requests */
const commonUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';

/** Maximum number of redirects to follow */
const maxRedirects = 5;

/** Request timeout in milliseconds */
const requestTimeout = 30000;

/** Maximum number of retries for network errors */
const maxRetries = 3;

/** Initial retry delay in milliseconds */
const initialRetryDelay = 1000;

/** Common request headers */
const commonHeaders = {
  'User-Agent': commonUserAgent,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

/**
 * Interface for the response from URL validation
 */
interface UrlValidationResult {
  url: string;
  status: number;
  error?: string;
}

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Checks if an error is retryable based on its error code
 * @param error - The error to check
 * @returns boolean indicating if the error is retryable
 * @remarks
 * The following error codes are considered retryable:
 * - ENETUNREACH: Network is unreachable
 * - ECONNRESET: Connection was reset
 * - ETIMEDOUT: Connection timed out
 * - ECONNREFUSED: Connection was refused
 */
const isRetryableError = (error: Error & { code?: string }): boolean => {
  const retryableCodes = ['ENETUNREACH', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
  return retryableCodes.includes(error.code || '');
};

/**
 * Makes an HTTP request to validate a URL
 * @param urlToTest - The URL to validate
 * @param proxyUrlFromTask - Optional proxy URL to use for the request
 * @param redirectCount - Current count of redirects followed
 * @param retryCount - Current retry attempt (0-based)
 * @returns Promise resolving to validation result
 * @remarks
 * The function implements a retry mechanism with exponential backoff:
 * - First retry: 1 second delay
 * - Second retry: 2 seconds delay
 * - Third retry: 4 seconds delay
 *
 * Retries are only attempted for specific network errors (see isRetryableError).
 * Each retry maintains the same redirect count and proxy configuration.
 */
const makeRequest = async (
  urlToTest: string,
  proxyUrlFromTask?: string,
  redirectCount = 0,
  retryCount = 0,
): Promise<UrlValidationResult> => {
  if (redirectCount > maxRedirects) {
    return { url: urlToTest, status: 0, error: 'Too many redirects' };
  }

  const effectiveProxyUrl = proxyUrlFromTask || process.env.https_proxy || process.env.HTTPS_PROXY;
  let agent: http.Agent | undefined;

  if (effectiveProxyUrl && urlToTest.startsWith('https')) {
    try {
      agent = new HttpsProxyAgent(effectiveProxyUrl);
    } catch (e: unknown) {
      return {
        url: urlToTest,
        status: 0,
        error: e instanceof Error ? e.message : 'Failed to create proxy agent',
      };
    }
  }

  const protocol = urlToTest.startsWith('https') ? https : http;
  const options: http.RequestOptions = {
    timeout: requestTimeout,
    headers: commonHeaders,
    agent,
  };

  try {
    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = protocol.get(urlToTest, options, resolve);
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${requestTimeout}ms`));
      });
    });

    const statusCode = response.statusCode || 0;
    const { location } = response.headers;

    // Handle redirects
    if (statusCode >= 300 && statusCode < 400 && location) {
      try {
        const currentUrl = new URL(urlToTest);
        const nextUrl = new URL(location, currentUrl.origin).toString();
        return await makeRequest(nextUrl, proxyUrlFromTask, redirectCount + 1);
      } catch (e: unknown) {
        return {
          url: urlToTest,
          status: 0,
          error: e instanceof Error ? e.message : 'Invalid redirect URL',
        };
      }
    }

    // Consume response data
    await new Promise<void>((resolve) => {
      response.on('data', () => undefined);
      response.on('end', resolve);
    });

    return { url: urlToTest, status: statusCode };
  } catch (err: unknown) {
    const error = err as Error & { code?: string; errors?: Array<Error & { code?: string }> };

    // Check if we should retry the request
    if (retryCount < maxRetries && isRetryableError(error)) {
      const delay = initialRetryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return makeRequest(urlToTest, proxyUrlFromTask, redirectCount, retryCount + 1);
    }

    let errorMessage = error.message;
    if (error.code) {
      errorMessage = `Code: ${error.code} - ${error.message}`;
    } else if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
      errorMessage = error.errors
        .map((e) => `(Code: ${e.code || 'N/A'} - ${e.message})`)
        .join('; ');
    }

    return { url: urlToTest, status: 0, error: errorMessage };
  }
};

/**
 * Validates multiple HTTPS URLs in parallel
 * @param urls - Array of URLs to validate
 * @param proxyUrlFromTask - Optional proxy URL to use for requests
 * @returns Promise resolving to array of validation results
 */
export async function validateHttpsUrls(
  urls: string[],
  proxyUrlFromTask?: string,
): Promise<UrlValidationResult[]> {
  return Promise.all(urls.map((url) => makeRequest(url, proxyUrlFromTask)));
}
