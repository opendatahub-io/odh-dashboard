import fs from 'fs';
import path from 'path';
import { env } from 'process';
import dotenv from 'dotenv';
import YAML from 'yaml';
import type { UserAuthConfig, TestConfig, AWSS3BucketDetails, AWSS3Buckets } from '~/__tests__/cypress/cypress/types';

[
  `.env.cypress${env.CY_MOCK ? '.mock' : ''}.local`,
  `.env.cypress${env.CY_MOCK ? '.mock' : ''}`,
  '.env.local',
  '.env',
].forEach((file) =>
  dotenv.config({
    path: path.resolve(__dirname, '../../../../../', file),
  }),
);

const testConfig: TestConfig | undefined = env.CY_TEST_CONFIG
  ? YAML.parse(fs.readFileSync(env.CY_TEST_CONFIG).toString())
  : undefined;

export const BASE_URL = testConfig?.ODH_DASHBOARD_URL || env.BASE_URL || '';

const TEST_USER: UserAuthConfig = testConfig?.TEST_USER ?? {
  AUTH_TYPE: env.TEST_USER_AUTH_TYPE || '',
  USERNAME: env.TEST_USER_USERNAME || '',
  PASSWORD: env.TEST_USER_PASSWORD || '',
};

const ADMIN_USER: UserAuthConfig = testConfig?.OCP_ADMIN_USER ?? {
  AUTH_TYPE: env.ADMIN_USER_AUTH_TYPE || '',
  USERNAME: env.ADMIN_USER_USERNAME || '',
  PASSWORD: env.ADMIN_USER_PASSWORD || '',
};

const AWS_PIPELINES_BUCKET_DETAILS: AWSS3BucketDetails = {
  NAME: testConfig?.S3.BUCKET_2.NAME || env.AWS_PIPELINES_BUCKET_NAME || '',
  REGION: testConfig?.S3.BUCKET_2.REGION || env.AWS_PIPELINES_BUCKET_REGION || '',
  ENDPOINT: testConfig?.S3.BUCKET_2.ENDPOINT || env.AWS_PIPELINES_BUCKET_ENDPOINT || ''
};
const AWS_PIPELINES: AWSS3Buckets = {
  AWS_ACCESS_KEY_ID: testConfig?.S3.AWS_ACCESS_KEY_ID || env.AWS_PIPELINES_BUCKET_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: testConfig?.S3.AWS_SECRET_ACCESS_KEY || env.AWS_PIPELINES_BUCKET_SECRET_ACCESS_KEY || '',
  BUCKET_2: AWS_PIPELINES_BUCKET_DETAILS
};

// spread the cypressEnv variables into the cypress config
export const cypressEnv = {
  TEST_USER,
  ADMIN_USER,
  AWS_PIPELINES,
};

// re-export the updated process env
export { env };
