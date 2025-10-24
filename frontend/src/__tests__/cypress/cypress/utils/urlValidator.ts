/**
 * Test utility to validate HTTP and HTTPS URLs with retry logic and error handling.
 *
 * Including:
 * - validateHttpsUrls(): Validate multiple URLs with proxy support and retries
 * - getErrorType(): Categorize HTTP status codes and network errors
 */

import * as http from 'http';
import * as https from 'https';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HttpsProxyAgent: new (options: string | object) => https.Agent = require('https-proxy-agent');

// Result interface for URL validation responses
interface UrlValidationResult {
  url: string;
  originalUrl?: string;
  status: number;
  error?: string;
}

// Common HTTP request configuration
const commonUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';
const maxRedirects = 5;
const requestTimeout = 3000;
const maxRetries = 3;
const initialRetryDelay = 1000;

// Standard headers for HTTP requests
const commonHeaders = {
  'User-Agent': commonUserAgent,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

// Utility function to pause execution for specified milliseconds
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    void setTimeout(resolve, ms);
  });

// Check if an error is retryable based on error codes and messages
const isRetryableError = (error: Error & { code?: string }): boolean => {
  const retryableCodes = ['ENETUNREACH', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
  // Only retry errors with known retryable codes or timeout-related errors without codes
  return (
    retryableCodes.includes(error.code || '') ||
    (!error.code && error.message.includes('timed out'))
  );
};

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
    // Make the HTTP request with timeout handling
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

    // Consume response data to properly close the connection
    await new Promise<void>((resolve) => {
      response.on('data', () => undefined);
      response.on('end', resolve);
    });

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

// Validate multiple URLs concurrently with proxy support and retry logic
export async function validateHttpsUrls(
  urls: string[],
  proxyUrlFromTask?: string,
): Promise<UrlValidationResult[]> {
  return Promise.all(urls.map((url) => makeRequest(url, proxyUrlFromTask)));
}

// Categorize HTTP status codes and network errors into error types
export const getErrorType = (status: number, error?: string): string => {
  if (status >= 400 && status < 500) {
    return 'CLIENT_ERROR';
  }
  if (status >= 500 && status < 600) {
    return 'SERVER_ERROR';
  }

  if (status === 0 && error) {
    if (error.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (error.includes('Too many redirects')) {
      return 'REDIRECT_MAX';
    }
    if (error.includes('Invalid redirect URL')) {
      return 'REDIRECT_INVALID';
    }
    if (error.includes('aborted')) {
      return 'ABORTED';
    }
    if (error.includes('Code:')) {
      return 'NETWORK_ERROR';
    }
  }

  return 'UNKNOWN';
};
