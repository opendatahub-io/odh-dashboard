import type { AutomlCleanupProject } from './automlCleanupManifest';
import type { AWSS3BucketDetails } from '../cypress/types';

export const DEFAULT_AWS_CLI_IMAGE =
  'amazon/aws-cli:2.27.50@sha256:48c3d4212e2f5b0e24bdc6af7708f9412ce65425a79575e0f78b8f8c0dcd70ab';

const OUTPUT_ROOTS: ReadonlySet<string> = new Set([
  'autogluon-tabular-training-pipeline',
  'autogluon-timeseries-training-pipeline',
]);

/** Keep all values in a single shell argument when running the AWS CLI pod. */
export const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

export const assertAutomlCleanupProject = (project: AutomlCleanupProject): void => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(project.namespace)) {
    throw new Error(`Invalid AutoML cleanup namespace: ${project.namespace}`);
  }
  for (const key of project.uploads) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/.test(key)) {
      throw new Error(`Invalid AutoML uploaded key in ${project.namespace}`);
    }
  }
  for (const run of project.runs) {
    if (!/^[A-Za-z0-9-]{1,128}$/.test(run.id)) {
      throw new Error(`Invalid AutoML run ID in ${project.namespace}`);
    }
    if (!OUTPUT_ROOTS.has(run.outputRoot)) {
      throw new Error(`Invalid AutoML output root in ${project.namespace}`);
    }
  }
};

/** Delete exact uploaded keys and run output prefixes, then check that each is absent. */
export const buildAutomlS3CleanupScript = (
  bucket: AWSS3BucketDetails,
  project: AutomlCleanupProject,
): string => {
  assertAutomlCleanupProject(project);
  if (!bucket.NAME || !bucket.REGION) {
    throw new Error(`Missing AutoML S3 bucket configuration for ${project.bucketKey}`);
  }
  if (bucket.NAME !== project.bucketName) {
    throw new Error(`AutoML S3 bucket does not match the recorded bucket for ${project.namespace}`);
  }

  const aws = `aws --region ${shellQuote(bucket.REGION)}${
    bucket.ENDPOINT ? ` --endpoint-url ${shellQuote(bucket.ENDPOINT)}` : ''
  }`;
  const bucketArg = `--bucket ${shellQuote(bucket.NAME)}`;
  const lines = ['set -u', 'failed=0'];

  for (const key of project.uploads) {
    const exactKeyQuery = `length(Contents[?Key=='${key}'] || \`[]\`)`;
    lines.push(
      `if ${aws} s3api delete-object ${bucketArg} --key ${shellQuote(key)} >/dev/null; then`,
      `  if count=$(${aws} s3api list-objects-v2 ${bucketArg} --prefix ${shellQuote(
        key,
      )} --max-keys 1 --no-paginate --query ${shellQuote(exactKeyQuery)} --output text); then`,
      `    if [ "$count" != '0' ]; then echo ${shellQuote(
        `Input key remains: ${key}`,
      )}; failed=1; fi`,
      '  else echo "Input key verification failed"; failed=1; fi',
      `else echo ${shellQuote(`Input key deletion failed: ${key}`)}; failed=1; fi`,
    );
  }

  for (const run of project.runs) {
    const prefix = `${run.outputRoot}/${run.id}/`;
    lines.push(
      `if ${aws} s3 rm ${shellQuote(
        `s3://${bucket.NAME}/${prefix}`,
      )} --recursive --only-show-errors; then`,
      `  if count=$(${aws} s3api list-objects-v2 ${bucketArg} --prefix ${shellQuote(
        prefix,
      )} --max-keys 1 --no-paginate --query KeyCount --output text); then`,
      `    if [ "$count" != '0' ]; then echo ${shellQuote(
        `Run output remains: ${prefix}`,
      )}; failed=1; fi`,
      '  else echo "Run output verification failed"; failed=1; fi',
      `else echo ${shellQuote(`Run output deletion failed: ${prefix}`)}; failed=1; fi`,
    );
  }

  lines.push('exit "$failed"');
  return lines.join('\n');
};
