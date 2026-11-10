import { runAwsCliInCluster } from './s3Cleanup';
import { resolveAutoXS3Endpoint } from '../autoXS3';
import { AWS_BUCKETS } from '../s3Buckets';
import type { AWSS3Buckets } from '../../types';

const getAwsPipelines = (): AWSS3Buckets =>
  (Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined) ?? AWS_BUCKETS;

/**
 * Delete AutoX S3 objects whose keys match a given prefix pattern.
 *
 * AutoML and AutoRAG use BUCKET_2/BUCKET_3. Their cleanup must use the same
 * endpoint as AutoX provisioning, while Feature Store cleanup keeps using its
 * own shared BUCKET_1 configuration.
 *
 * @param namespace Namespace to run the cleanup pod in
 * @param bucketKey Which AutoX bucket config to use
 * @param prefix S3 key prefix glob to delete (e.g. `*<uuid>*`)
 */
export const deleteAutoXS3TestFiles = (
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
      resolveAutoXS3Endpoint(bucketConfig.ENDPOINT),
      '--exclude',
      '*',
      '--include',
      prefix,
    ],
  });
};
