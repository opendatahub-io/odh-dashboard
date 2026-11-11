import { applyOpenShiftYaml } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const EVAL_HUB_OFFLINE_DATA_SECRET_NAME = 'evalhub-e2e-offline-data';
const EVAL_HUB_OFFLINE_DATA_INTERCEPT_ALIAS = 'evalHubOfflineDataRequest';
const EVAL_HUB_EVALUATION_JOBS_URL = '**/eval-hub/api/v1/evaluations/jobs*';
// Each scoped benchmark bundle provides its tokenizer at this path under /test_data.
const EVAL_HUB_OFFLINE_BUNDLE_TOKENIZER_PATH = '/test_data/tokenizer';

type EvalHubRequestBenchmark = {
  id?: string;
  // eslint-disable-next-line camelcase
  provider_id?: string;
  parameters?: Record<string, unknown>;
  test_data_ref?: unknown;
  [key: string]: unknown;
};

type EvalHubEvaluationRequest = {
  model?: {
    url?: string;
  };
  benchmarks?: EvalHubRequestBenchmark[] | null;
  collection?: {
    benchmarks?: EvalHubRequestBenchmark[] | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

type EvalHubEvaluationJobResponse = {
  data?: EvalHubEvaluationRequest;
  [key: string]: unknown;
};

type OfflineDataConfig = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  /** Shared root prefix; each request adds its provider and benchmark bundle path. */
  S3_KEY_PREFIX: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
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
    'S3_KEY_PREFIX',
    'S3_ENDPOINT',
    'S3_REGION',
  ];
  const config: Partial<OfflineDataConfig> = {
    AWS_ACCESS_KEY_ID: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_AWS_SECRET_ACCESS_KEY'),
    S3_BUCKET: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_BUCKET'),
    S3_KEY_PREFIX: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_KEY'),
    S3_ENDPOINT: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_ENDPOINT'),
    S3_REGION: Cypress.env('CY_EVAL_HUB_OFFLINE_DATA_S3_REGION'),
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

const getOfflineBenchmarkS3Key = (
  benchmark: EvalHubRequestBenchmark,
  config: OfflineDataConfig,
): string => {
  // eslint-disable-next-line camelcase
  const rawProviderId = benchmark.provider_id;
  const rawBenchmarkId = benchmark.id;
  const providerId = typeof rawProviderId === 'string' ? rawProviderId.trim() : '';
  const benchmarkId = typeof rawBenchmarkId === 'string' ? rawBenchmarkId.trim() : '';
  // The API permits a missing provider_id, but offline bundles are keyed by provider.
  if (!providerId) {
    throw new Error(
      'Offline EvalHub benchmark data requires provider_id to select a staged bundle.',
    );
  }

  const isSafeSegment = (segment: string): boolean =>
    segment !== '' && segment !== '.' && segment !== '..' && !segment.includes('\\');
  if (providerId.includes('/') || !isSafeSegment(providerId)) {
    throw new Error('Offline EvalHub provider_id must be a single safe path segment.');
  }
  // IDs such as inspect/bfcl are nested in the staged bundle layout.
  if (!benchmarkId || !benchmarkId.split('/').every(isSafeSegment)) {
    throw new Error('Offline EvalHub benchmark id must be a safe relative path.');
  }

  const rootPrefix = config.S3_KEY_PREFIX.replace(/^\/+|\/+$/g, '');
  if (!rootPrefix) {
    throw new Error('Offline EvalHub S3 key must be a non-empty root prefix.');
  }
  return `${rootPrefix}/fvt/benchmarks/${providerId}/${benchmarkId}/`;
};

const withOfflineData = (
  benchmark: EvalHubRequestBenchmark,
  config: OfflineDataConfig,
): EvalHubRequestBenchmark => {
  const s3Key = getOfflineBenchmarkS3Key(benchmark, config);
  return {
    ...benchmark,
    parameters: {
      ...benchmark.parameters,
      tokenizer: EVAL_HUB_OFFLINE_BUNDLE_TOKENIZER_PATH,
    },
    // eslint-disable-next-line camelcase
    test_data_ref: {
      s3: {
        bucket: config.S3_BUCKET,
        // Each benchmark gets only its staged bundle; the init container downloads every object
        // under this prefix and preserves paths relative to it under /test_data.
        key: s3Key,
        // eslint-disable-next-line camelcase
        secret_ref: EVAL_HUB_OFFLINE_DATA_SECRET_NAME,
      },
    },
  };
};

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

const withoutOfflineDataReferences = (job: EvalHubEvaluationRequest): EvalHubEvaluationRequest => {
  const stripBenchmarkDataRef = (benchmark: EvalHubRequestBenchmark) => {
    const cleanBenchmark = { ...benchmark };
    delete cleanBenchmark.test_data_ref;
    return cleanBenchmark;
  };

  return {
    ...job,
    ...(job.benchmarks ? { benchmarks: job.benchmarks.map(stripBenchmarkDataRef) } : {}),
    ...(job.collection?.benchmarks
      ? {
          collection: {
            ...job.collection,
            benchmarks: job.collection.benchmarks.map(stripBenchmarkDataRef),
          },
        }
      : {}),
  };
};

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

/**
 * Hides the offline-only data refs from the reconfigure loader. The UI uses test_data_ref to
 * identify prerecorded-response jobs, but Cypress adds this ref only to stage offline benchmark
 * inputs. The submission interceptor adds the refs back to the reconfigure POST.
 */
export const interceptEvalHubOfflineDataReadForReconfigure = (tenantNamespace: string): boolean => {
  if (!getOfflineDataConfig()) {
    return false;
  }

  cy.intercept(
    {
      method: 'GET',
      url: '**/eval-hub/api/v1/evaluations/jobs/*',
      query: { namespace: tenantNamespace },
    },
    (request) => {
      request.continue((response) => {
        const responseBody = response.body as EvalHubEvaluationJobResponse;
        if (!responseBody.data) {
          return;
        }
        response.send({
          ...responseBody,
          data: withoutOfflineDataReferences(responseBody.data),
        });
      });
    },
  ).as('evalHubOfflineDataReconfigureJob');

  return true;
};

/** Verifies the submitted request has offline data for every selected benchmark. */
export const assertEvalHubOfflineDataRequest = (): void => {
  const config = getOfflineDataConfig();
  if (!config) {
    return;
  }

  cy.wait(`@${EVAL_HUB_OFFLINE_DATA_INTERCEPT_ALIAS}`).then(({ request }) => {
    const evaluationRequest = request.body as EvalHubEvaluationRequest;
    expect(evaluationRequest.model?.url, 'model endpoint URL')
      .to.be.a('string')
      .and.to.have.length.greaterThan(0);

    const benchmarks = getRequestBenchmarks(evaluationRequest);
    expect(benchmarks, 'offline EvalHub request benchmarks').to.have.length.greaterThan(0);
    benchmarks.forEach((benchmark) => {
      const s3Key = getOfflineBenchmarkS3Key(benchmark, config);
      expect(benchmark.parameters?.tokenizer).to.equal(EVAL_HUB_OFFLINE_BUNDLE_TOKENIZER_PATH);
      expect(benchmark.test_data_ref).to.deep.equal({
        s3: {
          bucket: config.S3_BUCKET,
          key: s3Key,
          // eslint-disable-next-line camelcase
          secret_ref: EVAL_HUB_OFFLINE_DATA_SECRET_NAME,
        },
      });
    });
  });
};
