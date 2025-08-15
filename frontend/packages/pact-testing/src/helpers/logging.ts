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
 * Log an API call with consistent formatting
 */
export function logApiCall(method: string, url: string, headers: ApiCallHeaders = {}): void {
  console.log(`\n🌐 [${new Date().toISOString()}] ${method} ${url}`);
  console.log(`📤 Request Headers: ${JSON.stringify(headers, null, 2)}`);
}

/**
 * Log an API response with detailed information
 */
export function logApiResponse(testName: string, response: ApiResponse): void {
  console.log(`\n📥 [${new Date().toISOString()}] Response for "${testName}":`);
  console.log(`📊 Status: ${response.status}`);
  console.log(`📋 Headers: ${JSON.stringify(response.headers, null, 2)}`);
  console.log(`📄 Response Body: ${JSON.stringify(response.data, null, 2)}`);
  console.log(`⏱️  Response Time: Available in headers`);
}

/**
 * Log an API error with detailed information
 */
export function logApiError(testName: string, error: ApiError): void {
  console.log(`\n❌ [${new Date().toISOString()}] Error for "${testName}":`);
  
  if (error.status) {
    console.log(`📊 Error Status: ${error.status}`);
  }
  
  if (error.headers) {
    console.log(`📋 Error Headers: ${JSON.stringify(error.headers, null, 2)}`);
  }
  
  if (error.data) {
    console.log(`📄 Error Body: ${JSON.stringify(error.data, null, 2)}`);
  }
  
  if (error.message) {
    console.log(`💬 Error Message: ${error.message}`);
  }
}

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
