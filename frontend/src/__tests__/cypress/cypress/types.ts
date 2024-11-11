import type { RouteMatcher } from 'cypress/types/net-stubbing';
import type { ConfigMapKind, SecretKind } from '~/k8sTypes';

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

export type AWSS3BucketDetails = {
  NAME: string;
  REGION: string;
  ENDPOINT: string;
};

export type AWSS3Buckets = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  BUCKET_2: AWSS3BucketDetails;
};

export type DataConnectionReplacements = {
  NAMESPACE: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_DEFAULT_REGION: string;
  AWS_S3_BUCKET: string;
  AWS_S3_ENDPOINT: string;
  AWS_SECRET_ACCESS_KEY: string;
};

export type DspaSecretReplacements = {
  DSPA_SECRET_NAME: string;
  NAMESPACE: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
};

export type DspaReplacements = {
  DSPA_SECRET_NAME: string;
  NAMESPACE: string;
  AWS_S3_BUCKET: string;
};

export type StorageClassConfig = {
  isDefault: boolean;
  isEnabled: boolean;
  displayName: string;
  description?: string;
};

export type SCReplacements = {
  SC_NAME: string;
  SC_IS_DEFAULT: string;
  SC_IS_ENABLED: string;
};

export type CommandLineResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type TestConfig = {
  ODH_DASHBOARD_URL: string;
  TEST_USER: UserAuthConfig;
  OCP_ADMIN_USER: UserAuthConfig;
  S3: AWSS3Buckets;
};

export type DataScienceProjectData = {
  dsProjectName: string;
  dsProjectDescription: string;
  dsOCProjectName: string;
  dsProjectPermissionsName: string;
  dsProjectPermissionsDescription: string;
  dsOCProjectPermissionsName: string;
  dsOCProjectPermissionsContributorName: string;
};

export type NimServingResponse = {
  body: {
    body: ConfigMapKind | SecretKind;
  };
};

export type SettingsTestData = {
  pvcDefaultSize: number;
};

export type NotebookTolerationSettings = {
  enabled: boolean;
};

export type NotebookController = {
  enabled: boolean;
  pvcSize: string;
  notebookTolerationSettings: NotebookTolerationSettings;
};

export type DashboardConfig = {
  dashboardConfig: {
    disableModelServing: boolean;
  };
  notebookController: NotebookController;
  [key: string]: unknown;
};

export type NotebookControllerConfig = {
  ADD_FSGROUP: string;
  CLUSTER_DOMAIN: string;
  CULL_IDLE_TIME: string;
  ENABLE_CULLING: string;
  IDLENESS_CHECK_PERIOD: string;
  ISTIO_GATEWAY: string;
  ISTIO_HOST: string;
  USE_ISTIO: string;
};
