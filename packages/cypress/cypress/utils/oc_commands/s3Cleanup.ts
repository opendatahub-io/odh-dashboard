import { AWS_BUCKETS } from '../s3Buckets';

/** Shell-escape a value by wrapping in single quotes (handles embedded quotes). */
const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const assertValidNamespace = (namespace: string): void => {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Must be a valid DNS label (lowercase alphanumeric and hyphens).`,
    );
  }
};

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

  const bucketConfig = AWS_BUCKETS.BUCKET_1;
  const podName = `feast-s3-create-${Date.now()}`;
  const prefixKey = `feast-test/${namespace}/credit_scoring_local/`;

  cy.step(`Create Feast registry folder: s3://${bucketConfig.NAME}/${prefixKey}`);
  cy.exec(
    `oc run ${podName} -n ${namespace} ` +
      `--image=amazon/aws-cli:latest ` +
      `--restart=Never --rm --attach ` +
      `--env=AWS_ACCESS_KEY_ID=${shQuote(AWS_BUCKETS.AWS_ACCESS_KEY_ID)} ` +
      `--env=AWS_SECRET_ACCESS_KEY=${shQuote(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY)} ` +
      `--env=AWS_DEFAULT_REGION=${shQuote(bucketConfig.REGION)} ` +
      `-- s3api put-object --bucket ${shQuote(bucketConfig.NAME)} --key ${shQuote(prefixKey)}`,
    { failOnNonZeroExit: false, log: false, timeout: 120000 },
  ).then((result) => {
    if (result.code !== 0) {
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

  const bucketConfig = AWS_BUCKETS.BUCKET_1;
  const podName = `feast-s3-cleanup-${Date.now()}`;
  const s3Path = `s3://${bucketConfig.NAME}/feast-test/${namespace}/`;

  cy.exec(
    `oc run ${podName} -n ${namespace} ` +
      `--image=amazon/aws-cli:latest ` +
      `--restart=Never --rm --attach ` +
      `--env=AWS_ACCESS_KEY_ID=${shQuote(AWS_BUCKETS.AWS_ACCESS_KEY_ID)} ` +
      `--env=AWS_SECRET_ACCESS_KEY=${shQuote(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY)} ` +
      `--env=AWS_DEFAULT_REGION=${shQuote(bucketConfig.REGION)} ` +
      `-- s3 rm ${shQuote(s3Path)} --recursive`,
    { failOnNonZeroExit: false, log: false, timeout: 120000 },
  );
};
