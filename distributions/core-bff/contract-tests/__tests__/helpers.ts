import {
  ContractApiClient,
  ApiTestResultError,
  loadOpenAPISchema,
} from '@odh-dashboard/contract-tests';

export type ApiResult = Awaited<ReturnType<ContractApiClient['get']>>;
export type SuccessResult = Exclude<ApiResult, { success: false }>;

export const expectSuccess = (result: ApiResult): SuccessResult => {
  expect(result.success).toBe(true);
  return result;
};

export const expectError = (
  result: ApiResult,
  expectedStatus: number,
): ApiTestResultError['error'] => {
  expect(result.success).toBe(false);
  const { status, data, headers } = (result as ApiTestResultError).error;
  expect(status).toBe(expectedStatus);
  return { status, data, headers };
};

const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';

export const apiClient = new ContractApiClient({
  baseUrl,
  defaultHeaders: {
    'x-forwarded-access-token': 'FAKE_CLUSTER_ADMIN_TOKEN',
  },
});

export const unauthenticatedClient = new ContractApiClient({ baseUrl });

export const restrictedClient = new ContractApiClient({
  baseUrl,
  defaultHeaders: {
    'x-forwarded-access-token': 'FAKE_USER_B_TOKEN',
  },
});

export const apiSchema = loadOpenAPISchema('../bff/openapi/src/core-bff.yaml');
