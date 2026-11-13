import { getFeastS3Config, getS3CaBundle } from './feastS3';
import { DEFAULT_AWS_CLI_IMAGE } from '../../../src/automlCleanupCommands';
import { AWS_CLI_TASK_CLEANUP_HEADROOM_MS } from '../../../src/awsCliPodTaskConstants';
import type { AwsCliPodTaskOptions } from '../../../src/awsCliPodTask';
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
 * Run the AWS CLI in an ephemeral in-cluster Job.
 *
 * The Node-side task creates a credential Secret owned by a TTL-managed Job,
 * collects failure diagnostics, then deletes both resources after completion.
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

  const buckets = getAwsPipelines();
  const image =
    (Cypress.env('CY_S3_CLEANUP_IMAGE') as string | undefined) ||
    (Cypress.env('AWS_CLI_IMAGE') as string | undefined) ||
    DEFAULT_AWS_CLI_IMAGE;
  const taskOptions: AwsCliPodTaskOptions = {
    namespace,
    podName,
    image,
    region,
    awsAccessKeyId: buckets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: buckets.AWS_SECRET_ACCESS_KEY,
    awsCaBundle: getS3CaBundle(),
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
        throw new Error(`AWS CLI Job ${podName} or its cleanup failed: ${detail}`);
      }
      return cy
        .log(
          `WARNING: AWS CLI Job ${podName} or its cleanup failed; S3 objects or temporary resources may remain. Job diagnostics: ${detail}`,
        )
        .then(() => cy.wrap(result, { log: false }));
    });
};

/**
 * Delete S3 objects whose keys match a given prefix pattern.
 *
 * Best-effort — failures are logged but do not fail the test run so that
 * project cleanup can still proceed.
 *
 * Must be called before deleting the OpenShift project because the Job runs
 * inside that namespace.
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

const endpointArgs = (endpoint: string): string[] => (endpoint ? ['--endpoint-url', endpoint] : []);

/**
 * Creates the namespace-scoped Feast registry prefix in S3.
 *
 * Must run after the OpenShift project exists and before createFeatureStoreCR.
 */
export const createRegistryStep = (namespace: string): void => {
  assertValidNamespace(namespace);

  const config = getFeastS3Config();
  const podName = `feast-s3-create-${Date.now()}`;
  const prefixKey = `feast-test/${namespace}/credit_scoring_local/`;

  cy.step(`Create Feast registry folder: s3://${config.bucket}/${prefixKey}`);
  runAwsCliInCluster({
    namespace,
    podName,
    region: config.region,
    awsCliArgs: [
      's3api',
      'put-object',
      '--bucket',
      config.bucket,
      '--key',
      prefixKey,
      ...endpointArgs(config.endpoint),
    ],
    failOnNonZeroExit: true,
  }).then(() => {
    cy.log(`Created Feast registry folder s3://${config.bucket}/${prefixKey}`);
  });
};

/**
 * Delete the Feast registry files for a given test namespace from S3.
 *
 * Must be called before deleting the OpenShift project because the pod runs
 * inside that namespace.
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
