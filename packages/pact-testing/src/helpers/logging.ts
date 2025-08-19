/* eslint-disable no-console */
/**
 * Shared logging utilities for Pact contract testing
 */

// Use a more flexible type that's compatible with axios headers
export type ApiCallHeaders = Record<string, string | number | boolean | null | undefined>;

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
 * Redact sensitive headers to prevent logging of sensitive information
 */
export function redactHeaders(headers: ApiCallHeaders): ApiCallHeaders {
  const redacted = { ...headers };
  const sensitivePatterns = [
    /^authorization$/i,
    /^proxy-authorization$/i,
    /^api-key$/i,
    /^x-api-key$/i,
    /^cookie$/i,
    /^set-cookie$/i,
    /token/i,
    /secret/i,
  ];

  for (const [key, value] of Object.entries(redacted)) {
    if (typeof value === 'string') {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key)) {
          if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
            redacted[key] = 'Bearer REDACTED';
          } else if (
            key.toLowerCase() === 'authorization' &&
            value.toLowerCase().startsWith('basic ')
          ) {
            redacted[key] = 'Basic REDACTED';
          } else {
            redacted[key] = 'REDACTED';
          }
          break;
        }
      }
    }
  }

  return redacted;
}

/**
 * Sanitize response body to remove sensitive information
 */
export function sanitizeResponseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    // Simple redaction for common sensitive fields in JSON strings
    return body
      .replace(/"token":\s*"[^"]*"/g, '"token": "REDACTED"')
      .replace(/"secret":\s*"[^"]*"/g, '"secret": "REDACTED"')
      .replace(/"password":\s*"[^"]*"/g, '"password": "REDACTED"')
      .replace(/"api_key":\s*"[^"]*"/g, '"api_key": "REDACTED"');
  }
  return body;
}

/**
 * Log an API call with consistent formatting
 */
export function logApiCall(method: string, url: string, headers: ApiCallHeaders = {}): void {
  console.log(`\n🌐 [${new Date().toISOString()}] ${method} ${url}`);
  const redactedHeaders = redactHeaders(headers);
  console.log(`📤 Request Headers: ${JSON.stringify(redactedHeaders, null, 2)}`);
}

/**
 * Log an API response with detailed information
 */
export function logApiResponse(testName: string, response: ApiResponse): void {
  console.log(`\n📥 [${new Date().toISOString()}] Response for "${testName}":`);
  console.log(`📊 Status: ${response.status}`);
  const redactedHeaders = redactHeaders(response.headers);
  console.log(`📋 Headers: ${JSON.stringify(redactedHeaders, null, 2)}`);
  const sanitizedBody = sanitizeResponseBody(response.data);
  console.log(`📄 Response Body: ${JSON.stringify(sanitizedBody, null, 2)}`);
  console.log(`⏱️  Response Time: Available in headers`);
}

/**
 * Log an API error with detailed information
 */
export function logApiError(testName: string, error: ApiError): void {
  console.error(`\n❌ [${new Date().toISOString()}] Error for "${testName}":`);
  if (error.status) {
    console.error(`📊 Error Status: ${error.status}`);
  }
  if (error.headers) {
    const redactedHeaders = redactHeaders(error.headers);
    console.error(`📋 Error Headers: ${JSON.stringify(redactedHeaders, null, 2)}`);
  }
  if (error.data) {
    const sanitizedBody = sanitizeResponseBody(error.data);
    console.error(`📄 Error Body: ${JSON.stringify(sanitizedBody, null, 2)}`);
  }
  
    if (error.message) {
    console.error(`💬 Error Message: ${error.message}`);
  }}

/**
 * Log test setup information
 */
export function logTestSetup(packageName: string, bffUrl: string, resultsDir: string): void {
  console.log(`\n🚀 [${new Date().toISOString()}] Starting Contract Tests for ${packageName}`);
  console.log(`🔗 Mock BFF Server: ${bffUrl}`);
  console.log(`📂 Test Results Dir: ${resultsDir}`);
}

/**
 * Log successful test completion
 */
export function logTestSuccess(testName: string, details?: string): void {
  console.log(`✅ ${testName} - Contract verified`);
  if (details) {
    console.log(`📊 ${details}`);
  }
}
