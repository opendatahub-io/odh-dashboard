import type { RouteMatcher } from 'cypress/types/net-stubbing';

export type Snapshot = {
  method: string;
  url: string;
  statusCode: number;
  body: string;
};

export type InterceptTrigger = () => void;

export type InterceptSnapshot = {
  (url: RouteMatcher, alias: string, controlled: true): Cypress.Chainable<InterceptTrigger>;
  (url: RouteMatcher, alias: string, controlled: false): Cypress.Chainable<null>;
  (
    url: RouteMatcher,
    alias: string,
    controlled?: boolean,
  ): Cypress.Chainable<InterceptTrigger | null>;
};

export type UserAuthConfig = {
  AUTH_TYPE: string;
  USERNAME: string;
  PASSWORD: string;
};

export type AWSS3Bucket = {
  BUCKET_NAME: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_ENDPOINT: string;
  AWS_REGION: string;
};

export type TestConfig = {
  ODH_DASHBOARD_URL: string;
  TEST_USER: UserAuthConfig;
  OCP_ADMIN_USER: UserAuthConfig;
  AWS_PIPELINES_BUCKET: AWSS3Bucket;
};
