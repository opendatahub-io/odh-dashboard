import { DEFAULT_AWS_CLI_IMAGE } from '../../../src/automlCleanupCommands';
import {
  AWS_CLI_TASK_CLEANUP_HEADROOM_MS,
  type AwsCliPodTaskOptions,
} from '../../../src/awsCliPodTask';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { AWSS3Buckets, CommandLineResult } from '../../types';
import { AWS_BUCKETS } from '../s3Buckets';

const K8S_DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

const assertK8sDnsLabel = (kind: string, value: string): void => {
  if (!K8S_DNS_LABEL.test(value) || value.length > 63) {
    throw new Error(`Invalid ${kind} for oc command`);
  }
};

const getAwsPipelines = (): AWSS3Buckets =>
  (Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined) ?? AWS_BUCKETS;

type AwsCliPodOptions = {
  namespace: string;
  podName: string;
  region: string;
  awsCliArgs: string[];
  command?: string[];
  failOnNonZeroExit?: boolean;
  timeout?: number;
};

/**
 * Run the AWS CLI in an ephemeral in-cluster pod.
 *
 * Credentials are mounted from a temporary Secret via `--overrides`
 * (`envFrom.secretRef`), so the `oc run` argv (and therefore Cypress `[EXEC]`
 * logs) never contain the keys.
 * A Node-side task applies the Secret, runs `oc`, collects failure diagnostics,
 * and deletes the pod and Secret in `finally` even if Cypress times out.
 */
export const runAwsCliInCluster = ({
  namespace,
  podName,
  region,
  awsCliArgs,
  command,
  failOnNonZeroExit = false,
  timeout = 420000,
}: AwsCliPodOptions): Cypress.Chainable<CommandLineResult> => {
  assertK8sDnsLabel('namespace', namespace);
  assertK8sDnsLabel('pod name', podName);

  const secretName = `${podName}-creds`;
  assertK8sDnsLabel('secret name', secretName);

  const buckets = getAwsPipelines();
  const image = (Cypress.env('CY_S3_CLEANUP_IMAGE') as string | undefined) || DEFAULT_AWS_CLI_IMAGE;
  // Leave time after the subprocess timeout for the Node task's finally cleanup.
  const taskOptions: AwsCliPodTaskOptions = {
    namespace,
    podName,
    image,
    region,
    awsAccessKeyId: buckets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: buckets.AWS_SECRET_ACCESS_KEY,
    awsCliArgs,
    command,
    timeout,
  };
  return cy
    .task<CommandLineResult>('runAwsCliInCluster', taskOptions, {
      log: false,
      timeout: timeout + AWS_CLI_TASK_CLEANUP_HEADROOM_MS,
    })
    .then((result): Cypress.Chainable<CommandLineResult> => {
      if (result.exitCode === 0) {
        return cy.wrap(result, { log: false });
      }

      const detail = maskSensitiveInfo(`${result.stderr}\n${result.stdout}`.slice(0, 6000));
      if (failOnNonZeroExit) {
        throw new Error(`AWS CLI pod ${podName} or its cleanup failed: ${detail}`);
      }
      return cy
        .log(
          `WARNING: AWS CLI pod ${podName} or its cleanup failed; ` +
            `S3 objects or temporary resources may remain. Pod diagnostics: ${detail}`,
        )
        .then(() => cy.wrap(result, { log: false }));
    });
};

/**
 * Delete S3 objects whose keys match a given prefix pattern.
 *
 * Runs an ephemeral pod with the AWS CLI image to execute
 * `aws s3 rm --recursive`. The helper removes the pod after collecting
 * diagnostics when startup or deletion fails.
 *
 * Best-effort — failures are logged but do not fail the test run so
 * that project cleanup can still proceed.
 *
 * Must be called **before** `deleteOpenShiftProject` because the pod
 * runs inside that namespace.
 *
 * @param namespace  Namespace to run the cleanup pod in
 * @param bucketKey  Which bucket config to use
 * @param prefix     S3 key prefix glob to delete (e.g. `*<uuid>*`)
 */
export const deleteS3TestFiles = (
  namespace: string,
  bucketKey: 'BUCKET_2' | 'BUCKET_3',
  prefix: string,
): void => {
  if (!/^[a-zA-Z0-9\-_*]+$/.test(prefix)) {
    throw new Error(
      `Invalid S3 prefix pattern: ${prefix}. Only alphanumeric, hyphens, asterisks, and underscores allowed.`,
    );
  }

  const bucketConfig = getAwsPipelines()[bucketKey];
  const podName = `s3-cleanup-${Date.now()}`;

  runAwsCliInCluster({
    namespace,
    podName,
    region: bucketConfig.REGION,
    awsCliArgs: [
      's3',
      'rm',
      `s3://${bucketConfig.NAME}/`,
      '--recursive',
      '--endpoint-url',
      bucketConfig.ENDPOINT,
      '--exclude',
      '*',
      '--include',
      prefix,
    ],
  });
};

const assertValidNamespace = (namespace: string): void => {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Must be a valid DNS label (lowercase alphanumeric and hyphens).`,
    );
  }
};

const requireBucket1 = (): AWSS3Buckets => {
  const buckets = getAwsPipelines();
  if (!buckets.BUCKET_1.NAME) {
    throw new Error(
      'AWS_PIPELINES.BUCKET_1.NAME is empty. Export CY_TEST_CONFIG to packages/cypress/test-variables.yml (S3.BUCKET_1) before running E2E.',
    );
  }
  return buckets;
};

const endpointArgs = (endpoint: string): string[] => (endpoint ? ['--endpoint-url', endpoint] : []);

/**
 * Creates an empty S3 prefix for the namespace-scoped Feast registry.
 *
 * Path: `s3://<bucket>/feast-test/<namespace>/credit_scoring_local/`
 *
 * Does not seed registry.pb — the FeatureStore CR (`feast.yaml`) creates the
 * registry object, and later test steps (e.g. saved dataset) write into it.
 *
 * Must run after the OpenShift project exists and before `createFeatureStoreCR`.
 *
 * @param namespace The test namespace (S3 path segment and pod namespace)
 */
export const createRegistryStep = (namespace: string): void => {
  assertValidNamespace(namespace);

  const buckets = requireBucket1();
  const bucketConfig = buckets.BUCKET_1;
  const podName = `feast-s3-create-${Date.now()}`;
  const prefixKey = `feast-test/${namespace}/credit_scoring_local/`;

  cy.step(`Create Feast registry folder: s3://${bucketConfig.NAME}/${prefixKey}`);
  runAwsCliInCluster({
    namespace,
    podName,
    region: bucketConfig.REGION,
    awsCliArgs: [
      's3api',
      'put-object',
      '--bucket',
      bucketConfig.NAME,
      '--key',
      prefixKey,
      ...endpointArgs(bucketConfig.ENDPOINT),
    ],
    failOnNonZeroExit: true,
  });
  cy.log(`Created Feast registry folder s3://${bucketConfig.NAME}/${prefixKey}`);
};

/**
 * Delete the Feast registry files for a given test namespace from S3.
 *
 * Removes `feast-test/<namespace>/` recursively from BUCKET_1.
 * Must be called before `deleteOpenShiftProject` (pod runs in that namespace).
 *
 * @param namespace The test namespace (also used as the S3 path segment)
 */
export const deleteFeastRegistryFiles = (namespace: string): void => {
  assertValidNamespace(namespace);

  const buckets = getAwsPipelines();
  if (!buckets.BUCKET_1.NAME) {
    cy.log('Skipping Feast S3 cleanup: AWS_PIPELINES.BUCKET_1.NAME is empty');
    return;
  }
  const bucketConfig = buckets.BUCKET_1;

  const podName = `feast-s3-cleanup-${Date.now()}`;
  const s3Path = `s3://${bucketConfig.NAME}/feast-test/${namespace}/`;

  runAwsCliInCluster({
    namespace,
    podName,
    region: bucketConfig.REGION,
    awsCliArgs: ['s3', 'rm', s3Path, '--recursive', ...endpointArgs(bucketConfig.ENDPOINT)],
  });
};
