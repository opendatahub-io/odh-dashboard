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
  BUCKET_1: AWSS3BucketDetails;
  BUCKET_2: AWSS3BucketDetails;
  BUCKET_3: AWSS3BucketDetails;
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

export type PVCReplacements = {
  NAMESPACE: string;
  PVC_NAME: string;
  PVC_DISPLAY_NAME: string;
  PVC_SIZE: string;
};

export type WBEditTestData = {
  editTestNamespace: string;
  editedTestNamespace: string;
  editedTestDescription: string;
  pvcEditDisplayName: string;
};

export type WBControlSuiteTestData = {
  controlSuiteTestNamespace: string;
  controlSuiteTestDescription: string;
};

export type CommandLineResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type TestConfig = {
  ODH_DASHBOARD_URL: string;
  TEST_USER_3: UserAuthConfig;
  OCP_ADMIN_USER: UserAuthConfig;
  S3: AWSS3Buckets;
  APPLICATIONS_NAMESPACE: NamespaceConfig;
  PIP_INDEX_URL: string;
  PIP_TRUSTED_HOST: string;
};

export type DataScienceProjectData = {
  projectDisplayName: string;
  projectDescription: string;
  projectResourceName: string;
  projectPermissionResourceName: string;
  projectContributorResourceName: string;
  projectEditName: string;
  projectEditDescription: string;
  projectEditResourceName: string;
  projectEditUpdatedName: string;
  projectSingleModelDisplayName: string;
  projectSingleModelResourceName: string;
  singleModelName: string;
  modelFilePath: string;
  projectSingleModelAdminDisplayName: string;
  projectSingleModelAdminResourceName: string;
  singleModelAdminName: string;
  modelOpenVinoPath: string;
  projectMultiModelAdminDisplayName: string;
  projectMultiModelAdminResourceName: string;
  multiModelAdminName: string;
  modelOpenVinoExamplePath: string;
};

export type NotebookImageData = {
  codeserverImageName: string;
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
    disableModelMesh: boolean;
    disableKServe: boolean;
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

export type NotebookControllerCullerConfig = {
  CULL_IDLE_TIME: string;
  ENABLE_CULLING: string;
  IDLENESS_CHECK_PERIOD: string;
};

export type ResourceData = {
  kind: string;
  labelSelector: string;
  createdName: string;
  metaDataName: string;
  description: string;
  yamlPath: string;
};

export type ResourcesData = {
  resources: {
    CustomQuickStart: ResourceData[];
    CustomApplication: ResourceData[];
    CustomHowTo: ResourceData[];
    CustomTutorial: ResourceData[];
  };
};

export type NamespaceConfig = {
  APPLICATIONS_NAMESPACE: string;
};
