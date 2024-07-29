import fs from 'fs';
import path from 'path';
import { env } from 'process';
import dotenv from 'dotenv';
import YAML from 'yaml';
import type { UserAuthConfig, TestConfig } from '~/__tests__/cypress/cypress/types';

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

// spread the cypressEnv variables into the cypress config
export const cypressEnv = {
  TEST_USER,
  ADMIN_USER,
};

// re-export the updated process env
export { env };
