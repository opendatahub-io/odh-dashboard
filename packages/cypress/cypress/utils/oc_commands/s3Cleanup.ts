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
      `--image=amazon/aws-cli:2 ` +
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
