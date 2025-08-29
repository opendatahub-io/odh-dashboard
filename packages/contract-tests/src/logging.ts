export interface ApiCallHeaders {
  [key: string]: string;
}

export interface ApiResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

export function logTestSetup(packageName: string, baseUrl: string, resultsDir?: string): void {
  console.log(`🚀 Setting up contract tests for ${packageName}`);
  console.log(`   Base URL: ${baseUrl}`);
  if (resultsDir) {
    console.log(`   Results: ${resultsDir}`);
  }
}

export function logApiCall(method: string, url: string, testName: string, headers?: ApiCallHeaders): void {
  console.log(`📡 ${method} ${url} (${testName})`);
  if (headers && Object.keys(headers).length > 0) {
    console.log(`   Headers: ${JSON.stringify(headers, null, 2)}`);
  }
}

export function logApiResponse(response: ApiResponse, testName: string): void {
  console.log(`✅ ${testName} - Status: ${response.status}`);
  console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
}

export function logApiError(error: ApiError, testName: string): void {
  console.error(`❌ ${testName} - Error: ${error.message}`);
  if (error.status) {
    console.error(`   Status: ${error.status}`);
  }
  if (error.data) {
    console.error(`   Data: ${JSON.stringify(error.data, null, 2)}`);
  }
}

export function logTestSuccess(testName: string): void {
  console.log(`✅ ${testName} - PASSED`);
}

export function logTestFailure(testName: string, error: string): void {
  console.error(`❌ ${testName} - FAILED: ${error}`);
}
