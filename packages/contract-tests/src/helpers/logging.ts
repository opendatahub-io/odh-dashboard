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
export function logApiCall(
  method: string,
  url: string,
  testName: string,
  headers?: ApiCallHeaders,
): void {
  console.log(`\n[Contract Test] API Call: ${method} ${url} (${testName})`);
  if (headers && Object.keys(headers).length > 0) {
    const headerCount = Object.keys(headers).length;
    console.log(`Headers: ${headerCount} header(s) provided`);
  }
}

/**
 * Log an API response with redacted headers
 */
export function logApiResponse(response: ApiResponse, testName: string): void {
  console.log(`\n[Contract Test] ${testName} - Response: ${response.status}`);

  const headerCount = Object.keys(response.headers).length;
  if (headerCount > 0) {
    console.log(`Headers: ${headerCount} header(s) received`);
  }

  // Log data size instead of full content for brevity
  if (response.data) {
    const dataSize = JSON.stringify(response.data).length;
    console.log(`Data: ${dataSize} bytes`);
  }
}

/**
 * Log an API error with redacted headers
 */
export function logApiError(error: ApiError, testName: string): void {
  const status = error.status || 'Unknown';
  const message = error.message || 'No message';
  console.error(`\n[Contract Test] ${testName} - Error: ${status} - ${message}`);
  if (error.headers && Object.keys(error.headers).length > 0) {
    const headerCount = Object.keys(error.headers).length;
    console.error(`Headers: ${headerCount} header(s) received`);
  }
  // Avoid logging raw error data to prevent PII leakage
}

/**
 * Log test setup information
 */
export function logTestSetup(packageName: string, baseUrl: string, resultsDir?: string): void {
  console.log(`\n[Contract Test] Setup: ${packageName} -> ${baseUrl}`);
  if (resultsDir) {
    console.log(`Results: ${resultsDir}`);
  }
}

/**
 * Log test success
 */
export function logTestSuccess(testName: string): void {
  console.log(`✅ ${testName}`);
}

/**
 * Log test failure
 */
export function logTestFailure(testName: string, error: string): void {
  console.error(`❌ ${testName}: ${error}`);
}
