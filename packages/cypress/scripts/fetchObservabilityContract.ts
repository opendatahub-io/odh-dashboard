import fs from 'fs';
import path from 'path';
import {
  parseObservabilityContractYaml,
  validateObservabilityContractRef,
  validateRequiredDashboardRecords,
  type ObservabilityContract,
} from '../cypress/utils/observabilityContract';

const CONTRACT_PATH = 'tests/observability/contracts/release_contract.yaml';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/opendatahub-io/opendatahub-tests';
const DEFAULT_CONTRACT_REF = 'main';
const MAX_ATTEMPTS = 3;
const PACKAGE_ROOT = path.resolve(__dirname, '..');

const requiresImmutableContractRef = (): boolean =>
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  Boolean(process.env.BUILD_NUMBER || process.env.JENKINS_URL || process.env.GITHUB_ACTIONS);

const resolvePath = (value: string | undefined, fallback: string): string =>
  path.resolve(PACKAGE_ROOT, value || fallback);

const resolveOutputPath = (): string =>
  resolvePath(
    process.env.CY_OBSERVABILITY_CONTRACT_PATH,
    path.join(
      process.env.CY_RESULTS_DIR || 'results',
      'e2e',
      'observability',
      'release_contract.yaml',
    ),
  );

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const fetchContract = async (ref: string): Promise<{ source: string; content: string }> => {
  const url = `${RAW_BASE_URL}/${encodeURI(ref)}/${CONTRACT_PATH}`;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_ATTEMPTS) {
        throw lastError;
      }
      await wait(attempt * 1000);
      continue;
    }
    if (response.ok) {
      return { source: url, content: await response.text() };
    }
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    lastError = new Error(`GitHub returned HTTP ${response.status} for the release contract`);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw lastError;
    }
    await wait(attempt * 1000);
  }
  throw lastError || new Error('Unable to fetch the observability release contract');
};

const writeContract = (outputPath: string, content: string, contract: ObservabilityContract) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, { encoding: 'utf8', mode: 0o600 });
  console.log(
    `Validated observability contract ${contract.contractVersion} for ${contract.releaseStage}; wrote ${outputPath}`,
  );
};

const main = async () => {
  const configuredRef = process.env.RHOAI_OBSERVABILITY_CONTRACT_REF;
  if (!configuredRef && requiresImmutableContractRef()) {
    throw new Error(
      'RHOAI_OBSERVABILITY_CONTRACT_REF must be provided for productized or CI observability runs',
    );
  }
  const ref = configuredRef
    ? validateObservabilityContractRef(configuredRef)
    : DEFAULT_CONTRACT_REF;
  if (!configuredRef) {
    console.warn(
      `RHOAI_OBSERVABILITY_CONTRACT_REF was not provided; using the mutable default '${DEFAULT_CONTRACT_REF}'`,
    );
  }

  const source = await fetchContract(ref);
  const contract = parseObservabilityContractYaml(source.content);
  validateRequiredDashboardRecords(contract);
  writeContract(resolveOutputPath(), source.content, contract);
  console.log(`Observability contract source: ${source.source}`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
