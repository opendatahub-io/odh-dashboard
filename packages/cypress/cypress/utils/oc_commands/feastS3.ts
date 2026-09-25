import type { AWSS3Buckets } from '../../types';
import { AWS_BUCKETS, parseS3Endpoint } from '../s3Buckets';

export type FeastS3Config = {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const getAwsPipelines = (): AWSS3Buckets =>
  (Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined) ?? AWS_BUCKETS;

export const getS3CaBundle = (): string => getAwsPipelines().AWS_CA_BUNDLE ?? '';

export const isAwsS3Endpoint = (endpoint: string): boolean => {
  if (!endpoint) {
    return true;
  }
  const hostname = parseS3Endpoint(endpoint).host.split(':')[0];
  return /(^|\.)amazonaws\.com$/i.test(hostname);
};

export const getFeastS3Config = (): FeastS3Config => {
  const buckets = getAwsPipelines();
  if (!buckets.BUCKET_1.NAME) {
    throw new Error(
      'AWS_PIPELINES.BUCKET_1.NAME is empty. Export CY_TEST_CONFIG to packages/cypress/test-variables.yml before running E2E.',
    );
  }
  return {
    bucket: buckets.BUCKET_1.NAME,
    region: buckets.BUCKET_1.REGION,
    endpoint: buckets.BUCKET_1.ENDPOINT,
    accessKeyId: buckets.AWS_ACCESS_KEY_ID,
    secretAccessKey: buckets.AWS_SECRET_ACCESS_KEY,
  };
};
