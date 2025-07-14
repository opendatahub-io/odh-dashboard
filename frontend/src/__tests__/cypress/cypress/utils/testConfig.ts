/* eslint-disable no-barrel-files/no-barrel-files */

import fs from 'fs';
import path from 'path';
import { env } from 'process';
import dotenv from 'dotenv';
import YAML from 'yaml';
import type {
  UserAuthConfig,
  TestConfig,
  AWSS3BucketDetails,
  AWSS3Buckets,
} from '#~/__tests__/cypress/cypress/types';

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

const LDAP_CONTRIBUTOR_USER: UserAuthConfig = testConfig?.TEST_USER_3 ?? {
  AUTH_TYPE: env.TEST_USER_3_AUTH_TYPE || '',
  USERNAME: env.TEST_USER_3_USERNAME || '',
  PASSWORD: env.TEST_USER_3_PASSWORD || '',
};

const LDAP_CONTRIBUTOR_GROUP: UserAuthConfig = testConfig?.TEST_USER_3 ?? {
  AUTH_TYPE: env.TEST_USER_3_AUTH_TYPE || '',
  USERNAME: `${env.TEST_USER_3_USERNAME ?? ''}-group`,
  PASSWORD: env.TEST_USER_3_PASSWORD || '',
};

const HTPASSWD_CLUSTER_ADMIN_USER: UserAuthConfig = testConfig?.OCP_ADMIN_USER ?? {
  AUTH_TYPE: env.ADMIN_USER_AUTH_TYPE || '',
  USERNAME: env.ADMIN_USER_USERNAME || '',
  PASSWORD: env.ADMIN_USER_PASSWORD || '',
};

const AWS_PIPELINES_BUCKET_1: AWSS3BucketDetails = {
  NAME: testConfig?.S3.BUCKET_1.NAME || env.AWS_PIPELINES_BUCKET_NAME || '',
  REGION: testConfig?.S3.BUCKET_1.REGION || env.AWS_PIPELINES_BUCKET_REGION || '',
  ENDPOINT: testConfig?.S3.BUCKET_1.ENDPOINT || env.AWS_PIPELINES_BUCKET_ENDPOINT || '',
};

const AWS_PIPELINES_BUCKET_2: AWSS3BucketDetails = {
  NAME: testConfig?.S3.BUCKET_2.NAME || env.AWS_PIPELINES_BUCKET_NAME || '',
  REGION: testConfig?.S3.BUCKET_2.REGION || env.AWS_PIPELINES_BUCKET_REGION || '',
  ENDPOINT: testConfig?.S3.BUCKET_2.ENDPOINT || env.AWS_PIPELINES_BUCKET_ENDPOINT || '',
};

const AWS_PIPELINES_BUCKET_3: AWSS3BucketDetails = {
  NAME: testConfig?.S3.BUCKET_3.NAME || env.AWS_PIPELINES_BUCKET_3_NAME || '',
  REGION: testConfig?.S3.BUCKET_3.REGION || env.AWS_PIPELINES_BUCKET_3_REGION || '',
  ENDPOINT: testConfig?.S3.BUCKET_3.ENDPOINT || env.AWS_PIPELINES_BUCKET_3_ENDPOINT || '',
};

const AWS_PIPELINES: AWSS3Buckets = {
  AWS_ACCESS_KEY_ID:
    testConfig?.S3.AWS_ACCESS_KEY_ID || env.AWS_PIPELINES_BUCKET_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY:
    testConfig?.S3.AWS_SECRET_ACCESS_KEY || env.AWS_PIPELINES_BUCKET_SECRET_ACCESS_KEY || '',
  BUCKET_1: AWS_PIPELINES_BUCKET_1,
  BUCKET_2: AWS_PIPELINES_BUCKET_2,
  BUCKET_3: AWS_PIPELINES_BUCKET_3,
};

const APPLICATIONS_NAMESPACE = testConfig?.APPLICATIONS_NAMESPACE;
const PRODUCT_NAME = testConfig?.ODH_DASHBOARD_PROJECT_NAME;
const PIP_INDEX_URL = testConfig?.PIP_INDEX_URL;
const PIP_TRUSTED_HOST = testConfig?.PIP_TRUSTED_HOST;
const NGC_API_KEY = testConfig?.NGC_API_KEY;
const OCI_SECRET_DETAILS_FILE = testConfig?.OCI_SECRET_DETAILS_FILE;
const OCI_MODEL_URI = testConfig?.OCI_MODEL_URI;

// spread the cypressEnv variables into the cypress config
export const cypressEnv = {
  LDAP_CONTRIBUTOR_USER,
  LDAP_CONTRIBUTOR_GROUP,
  HTPASSWD_CLUSTER_ADMIN_USER,
  AWS_PIPELINES,
  APPLICATIONS_NAMESPACE,
  PRODUCT_NAME,
  PIP_INDEX_URL,
  PIP_TRUSTED_HOST,
  NGC_API_KEY,
  OCI_SECRET_DETAILS_FILE,
  OCI_MODEL_URI,
};

// re-export the updated process env
export { env };
