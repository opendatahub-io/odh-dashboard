import { applyOpenShiftYaml } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { AWSS3Buckets } from '../../types';
import { AWS_BUCKETS } from '../s3Buckets';

/** Shell-escape a value by wrapping in single quotes (handles embedded quotes). */
const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

/** Pinned AWS CLI image so the cleanup pod cannot drift to a mutated :latest tag. */
const AWS_CLI_IMAGE =
  'amazon/aws-cli:2.27.50@sha256:48c3d4212e2f5b0e24bdc6af7708f9412ce65425a79575e0f78b8f8c0dcd70ab';

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
  failOnNonZeroExit?: boolean;
  timeout?: number;
};

/**
 * Run the AWS CLI in an ephemeral in-cluster pod.
 *
 * Credentials are mounted from a temporary Secret via `--overrides`
 * (`envFrom.secretRef`), so the `oc run` argv (and therefore Cypress `[EXEC]`
 * logs) never contain the keys.
 * The Secret is deleted after the pod exits, including when `oc run` fails.
 */
export const runAwsCliInCluster = ({
  namespace,
  podName,
  region,
  awsCliArgs,
  failOnNonZeroExit = false,
  timeout = 120000,
}: AwsCliPodOptions): void => {
  assertK8sDnsLabel('namespace', namespace);
  assertK8sDnsLabel('pod name', podName);

  const secretName = `${podName}-creds`;
  assertK8sDnsLabel('secret name', secretName);

  const buckets = getAwsPipelines();
  const secretManifest = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName,
      namespace,
    },
    stringData: {
      AWS_ACCESS_KEY_ID: buckets.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: buckets.AWS_SECRET_ACCESS_KEY,
      AWS_DEFAULT_REGION: region,
    },
  });

  const deleteCredentials = () =>
    cy.exec(`oc delete secret ${shQuote(secretName)} -n ${shQuote(namespace)} --ignore-not-found`, {
      failOnNonZeroExit: false,
      log: false,
    });

  // `--overrides` replaces `spec.containers` wholesale, so it must carry image and args.
  const podOverrides = JSON.stringify({
    spec: {
      containers: [
        {
          name: podName,
          image: AWS_CLI_IMAGE,
          args: awsCliArgs,
          envFrom: [{ secretRef: { name: secretName } }],
        },
      ],
    },
  });

  applyOpenShiftYaml(secretManifest).then(() => {
    // failOnNonZeroExit must be false so Cypress still runs Secret cleanup after a
    // non-zero oc run. Re-throw after deletion when the caller asked to fail.
    return cy
      .exec(
        `oc run ${shQuote(podName)} -n ${shQuote(namespace)} ` +
          `--image=${shQuote(AWS_CLI_IMAGE)} ` +
          `--restart=Never --rm --attach --tty=false ` +
          `--overrides=${shQuote(podOverrides)}`,
        { failOnNonZeroExit: false, log: false, timeout },
      )
      .then((result) =>
        deleteCredentials().then(() => {
          if (result.exitCode === 0) {
            return;
          }
          const maskedStderr = maskSensitiveInfo(result.stderr);
          if (failOnNonZeroExit) {
            throw new Error(
              `AWS CLI pod ${podName} exited with code ${result.exitCode}: ${maskedStderr}`,
            );
          }
          cy.log(
            `WARNING: AWS CLI pod ${podName} exited with code ${result.exitCode}; ` +
              `S3 objects may have been left behind: ${maskedStderr}`,
          );
        }),
      );
  });
};

/**
 * Delete S3 objects whose keys match a given prefix pattern.
 *
 * Runs an ephemeral pod with the AWS CLI image to execute
 * `aws s3 rm --recursive`.  The pod is auto-removed via `--rm`.
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
