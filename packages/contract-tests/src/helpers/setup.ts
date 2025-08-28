import { logTestSetup } from './logging';
import { ContractSchemaValidator } from '../utils/schema-validation';
import { ensureBffHealthy, createBffConfig } from '../utils/bff-verification';
import { ContractApiClient } from '../utils/api-client';

type SetupOptions = {
  packageName: string;
  baseUrl: string;
  schema: Record<string, unknown>;
  resultsDir?: string;
  defaultHeaders?: Record<string, string>;
};

export async function setupContractTest({
  packageName,
  baseUrl,
  schema,
  resultsDir = './contract-tests/contract-test-results/latest',
  defaultHeaders = {},
}: SetupOptions): Promise<{ apiClient: ContractApiClient; validator: ContractSchemaValidator }> {
  logTestSetup(packageName, baseUrl, resultsDir);

  const validator = new ContractSchemaValidator();
  await validator.loadSchema(`${packageName}-schema`, schema);

  await ensureBffHealthy({ ...createBffConfig({ url: baseUrl }), maxRetries: 20, retryDelay: 500 });

  const apiClient = new ContractApiClient({ baseUrl, defaultHeaders });
  return { apiClient, validator };
}
