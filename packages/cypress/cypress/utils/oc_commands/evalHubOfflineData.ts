import { applyOpenShiftYaml } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const EVAL_HUB_OFFLINE_DATA_SECRET_NAME = 'evalhub-e2e-offline-data';
const EVAL_HUB_OFFLINE_DATA_INTERCEPT_ALIAS = 'evalHubOfflineDataRequest';
const EVAL_HUB_EVALUATION_JOBS_URL = '**/eval-hub/api/v1/evaluations/jobs*';

type EvalHubRequestBenchmark = {
  parameters?: Record<string, unknown>;
  test_data_ref?: unknown;
  [key: string]: unknown;
};

type EvalHubEvaluationRequest = {
  benchmarks?: EvalHubRequestBenchmark[];
  collection?: {
    benchmarks?: EvalHubRequestBenchmark[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type OfflineDataConfig = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  /** S3 object prefix downloaded into /test_data with its relative directory structure preserved. */
  S3_KEY: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  TOKENIZER_PATH: string;
};

const enabled = (value: unknown): boolean =>
  value === true || String(value).toLowerCase() === 'true';

const getOfflineDataConfig = (): OfflineDataConfig | undefined => {
  if (!enabled(Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_ENABLED'))) {
    return undefined;
  }

  const requiredKeys: Array<keyof OfflineDataConfig> = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'S3_KEY',
    'S3_ENDPOINT',
    'S3_REGION',
    'TOKENIZER_PATH',
  ];
  const config: Partial<OfflineDataConfig> = {
    AWS_ACCESS_KEY_ID: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_AWS_SECRET_ACCESS_KEY'),
    S3_BUCKET: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_BUCKET'),
    S3_KEY: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_KEY'),
    S3_ENDPOINT: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_ENDPOINT'),
    S3_REGION: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_REGION'),
    TOKENIZER_PATH: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_TOKENIZER_PATH'),
  };
  const missing = requiredKeys.filter((key) => !config[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Disconnected EvalHub data is enabled but missing required setting(s): ${missing.join(
        ', ',
      )}.`,
    );
  }

  return config as OfflineDataConfig;
};

const withOfflineData = (
  benchmark: EvalHubRequestBenchmark,
  config: OfflineDataConfig,
): EvalHubRequestBenchmark => ({
  ...benchmark,
  parameters: {
    ...benchmark.parameters,
    tokenizer: config.TOKENIZER_PATH,
  },
  // eslint-disable-next-line camelcase
  test_data_ref: {
    s3: {
      bucket: config.S3_BUCKET,
      // The EvalHub API calls this a key, but its init container downloads every object
      // under the value as a prefix and preserves their relative paths under /test_data.
      key: config.S3_KEY,
      // eslint-disable-next-line camelcase
      secret_ref: EVAL_HUB_OFFLINE_DATA_SECRET_NAME,
    },
  },
});

const withOfflineDataReferences = (
  request: EvalHubEvaluationRequest,
  config: OfflineDataConfig,
): EvalHubEvaluationRequest => {
  if (request.collection?.benchmarks) {
    return {
      ...request,
      collection: {
        ...request.collection,
        benchmarks: request.collection.benchmarks.map((benchmark) =>
          withOfflineData(benchmark, config),
        ),
      },
    };
  }

  if (request.benchmarks) {
    return {
      ...request,
      benchmarks: request.benchmarks.map((benchmark) => withOfflineData(benchmark, config)),
    };
  }

  throw new Error('EvalHub evaluation request does not contain benchmarks to configure offline.');
};

const getRequestBenchmarks = (request: EvalHubEvaluationRequest): EvalHubRequestBenchmark[] =>
  request.collection?.benchmarks ?? request.benchmarks ?? [];

/**
 * Creates the project-local credentials used by EvalHub Jobs to read the staged offline bundle.
 * This is a no-op unless the explicit offline-data configuration is enabled.
 */
export const provisionEvalHubOfflineDataSecret = (tenantNamespace: string): Cypress.Chainable => {
  const config = getOfflineDataConfig();
  if (!config) {
    return cy.wrap(null);
  }

  cy.step('[Setup] Create project-local EvalHub offline-data secret');
  const secretManifest = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: EVAL_HUB_OFFLINE_DATA_SECRET_NAME,
      namespace: tenantNamespace,
    },
    stringData: {
      AWS_ACCESS_KEY_ID: config.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: config.AWS_SECRET_ACCESS_KEY,
      AWS_DEFAULT_REGION: config.S3_REGION,
      AWS_S3_ENDPOINT: config.S3_ENDPOINT,
      AWS_S3_BUCKET: config.S3_BUCKET,
    },
  });

  return applyOpenShiftYaml(secretManifest).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to create EvalHub offline-data secret in ${tenantNamespace}: ${maskSensitiveInfo(
          result.stderr || result.stdout,
        )}`,
      );
    }
    return result;
  });
};

/**
 * Registers a pass-through interceptor that adds offline test data to an EvalHub submission.
 * Connected-cluster runs never register it, so their requests remain unchanged.
 */
export const interceptEvalHubOfflineDataRequest = (): boolean => {
  const config = getOfflineDataConfig();
  if (!config) {
    return false;
  }

  cy.intercept('POST', EVAL_HUB_EVALUATION_JOBS_URL, (request) => {
    Object.assign(request, {
      body: withOfflineDataReferences(request.body as EvalHubEvaluationRequest, config),
    });
    request.continue();
  }).as(EVAL_HUB_OFFLINE_DATA_INTERCEPT_ALIAS);
  return true;
};

/** Verifies the submitted request has offline data for every selected benchmark. */
export const assertEvalHubOfflineDataRequest = (): void => {
  const config = getOfflineDataConfig();
  if (!config) {
    return;
  }

  cy.wait(`@${EVAL_HUB_OFFLINE_DATA_INTERCEPT_ALIAS}`).then(({ request }) => {
    const benchmarks = getRequestBenchmarks(request.body as EvalHubEvaluationRequest);
    expect(benchmarks, 'offline EvalHub request benchmarks').to.have.length.greaterThan(0);
    benchmarks.forEach((benchmark) => {
      expect(benchmark.parameters?.tokenizer).to.equal(config.TOKENIZER_PATH);
      expect(benchmark.test_data_ref).to.deep.equal({
        s3: {
          bucket: config.S3_BUCKET,
          key: config.S3_KEY,
          // eslint-disable-next-line camelcase
          secret_ref: EVAL_HUB_OFFLINE_DATA_SECRET_NAME,
        },
      });
    });
  });
};
