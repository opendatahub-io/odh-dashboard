import type { AWSS3Buckets } from '../../types';
import { AWS_BUCKETS } from '../s3Buckets';

/** Shell-escape a value by wrapping in single quotes (handles embedded quotes). */
const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

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

  const bucketConfig = AWS_BUCKETS[bucketKey];
  const podName = `s3-cleanup-${Date.now()}`;

  cy.exec(
    `oc run ${podName} -n ${namespace} ` +
      `--image=amazon/aws-cli:latest ` +
      `--restart=Never --rm --attach ` +
      `--env=AWS_ACCESS_KEY_ID=${shQuote(AWS_BUCKETS.AWS_ACCESS_KEY_ID)} ` +
      `--env=AWS_SECRET_ACCESS_KEY=${shQuote(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY)} ` +
      `--env=AWS_DEFAULT_REGION=${shQuote(bucketConfig.REGION)} ` +
      `-- s3 rm ${shQuote(`s3://${bucketConfig.NAME}/`)} --recursive ` +
      `--endpoint-url ${shQuote(bucketConfig.ENDPOINT)} ` +
      `--exclude '*' --include '${prefix}'`,
    { failOnNonZeroExit: false, log: false, timeout: 120000 },
  );
};

const assertValidNamespace = (namespace: string): void => {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Must be a valid DNS label (lowercase alphanumeric and hyphens).`,
    );
  }
};

/** Prefer live Cypress.env — module-level Cypress.env can be empty at import. */
const getAwsPipelines = (): AWSS3Buckets =>
  (Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined) ?? AWS_BUCKETS;

const requireBucket1 = (): AWSS3Buckets => {
  const buckets = getAwsPipelines();
  if (!buckets.BUCKET_1.NAME) {
    throw new Error(
      'AWS_PIPELINES.BUCKET_1.NAME is empty. Export CY_TEST_CONFIG to packages/cypress/test-variables.yml (S3.BUCKET_1) before running E2E.',
    );
  }
  return buckets;
};

const endpointArg = (endpoint: string): string =>
  endpoint ? `--endpoint-url ${shQuote(endpoint)}` : '';

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
  cy.exec(
    `oc run ${podName} -n ${namespace} ` +
      `--image=amazon/aws-cli:latest ` +
      `--restart=Never --rm --attach --tty=false ` +
      `--env=AWS_ACCESS_KEY_ID=${shQuote(buckets.AWS_ACCESS_KEY_ID)} ` +
      `--env=AWS_SECRET_ACCESS_KEY=${shQuote(buckets.AWS_SECRET_ACCESS_KEY)} ` +
      `--env=AWS_DEFAULT_REGION=${shQuote(bucketConfig.REGION)} ` +
      `-- s3api put-object --bucket ${shQuote(bucketConfig.NAME)} --key ${shQuote(prefixKey)} ` +
      `${endpointArg(bucketConfig.ENDPOINT)}`,
    { failOnNonZeroExit: false, log: false, timeout: 120000 },
  ).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to create Feast registry folder s3://${bucketConfig.NAME}/${prefixKey}: ${
          result.stderr || result.stdout
        }`,
      );
    }
    cy.log(`Created Feast registry folder s3://${bucketConfig.NAME}/${prefixKey}`);
  });
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

  cy.exec(
    `oc run ${podName} -n ${namespace} ` +
      `--image=amazon/aws-cli:latest ` +
      `--restart=Never --rm --attach --tty=false ` +
      `--env=AWS_ACCESS_KEY_ID=${shQuote(buckets.AWS_ACCESS_KEY_ID)} ` +
      `--env=AWS_SECRET_ACCESS_KEY=${shQuote(buckets.AWS_SECRET_ACCESS_KEY)} ` +
      `--env=AWS_DEFAULT_REGION=${shQuote(bucketConfig.REGION)} ` +
      `-- s3 rm ${shQuote(s3Path)} --recursive ${endpointArg(bucketConfig.ENDPOINT)}`,
    { failOnNonZeroExit: false, log: false, timeout: 120000 },
  );
};
