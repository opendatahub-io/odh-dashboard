/**
 * Logging utilities for contract testing
 */

export interface ApiCallHeaders {
  [key: string]: string;
}

export interface ApiResponse {
  status: number;
  headers: ApiCallHeaders;
  data: unknown;
}

export interface ApiError {
  status?: number;
  headers?: ApiCallHeaders;
  data?: unknown;
  message?: string;
}

/**
 * Log an API call with redacted headers
 */
export function logApiCall(method: string, url: string, headers: ApiCallHeaders): void {
  const redactedHeaders = redactHeaders(headers);
  console.log(`\n[Contract Test] API Call: ${method} ${url}`);
  console.log('Headers:', redactedHeaders);
}

/**
 * Log an API response with redacted headers
 */
export function logApiResponse(testName: string, response: ApiResponse): void {
  const redactedHeaders = redactHeaders(response.headers);
  console.log(`\n[Contract Test] ${testName} - Response:`);
  console.log('Status:', response.status);
  console.log('Headers:', redactedHeaders);
  // Note: Response body should be sanitized before logging
  console.log('Data:', response.data);
}

/**
 * Log an API error with redacted headers
 */
export function logApiError(testName: string, error: ApiError): void {
  const redactedHeaders = error.headers ? redactHeaders(error.headers) : {};
  console.error(`\n[Contract Test] ${testName} - Error:`);
  console.error('Status:', error.status);
  console.error('Headers:', redactedHeaders);
  console.error('Message:', error.message);
  if (error.data) {
    // Note: Error data should be sanitized before logging
    console.error('Data:', error.data);
  }
}

/**
 * Log test setup information
 */
export function logTestSetup(packageName: string, baseUrl: string, resultsDir: string): void {
  console.log('\n[Contract Test] Test Setup:');
  console.log('Package:', packageName);
  console.log('Base URL:', baseUrl);
  console.log('Results Directory:', resultsDir);
}

/**
 * Log test success
 */
export function logTestSuccess(testName: string): void {
  console.log(`\n[Contract Test] ${testName} - Success`);
}

/**
 * Redact sensitive headers
 */
function redactHeaders(headers: ApiCallHeaders): ApiCallHeaders {
  const sensitiveHeaders = [
    'authorization',
    'proxy-authorization',
    'api-key',
    'x-api-key',
    'cookie',
    'set-cookie',
  ];

  const redacted = { ...headers };

  Object.keys(redacted).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (
      sensitiveHeaders.includes(lowerKey) ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret')
    ) {
      if (lowerKey === 'authorization' || lowerKey === 'proxy-authorization') {
        // Keep auth scheme (e.g., 'Bearer' or 'Basic') but redact the token
        const parts = redacted[key].split(' ');
        redacted[key] = parts.length > 1 ? `${parts[0]} REDACTED` : 'REDACTED';
      } else {
        redacted[key] = 'REDACTED';
      }
    }
  });

  return redacted;
}
