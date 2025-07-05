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
  AWS_REGION: string;
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
  STORAGE_CLASS: string;
};

export type WBEditTestData = {
  editTestNamespace: string;
  editedTestNamespace: string;
  editedTestDescription: string;
  pvcEditDisplayName: string;
  pvcStorageName: string;
};

export type WBControlSuiteTestData = {
  controlSuiteTestNamespace: string;
  controlSuiteTestDescription: string;
};

export type WBVariablesTestData = {
  wbVariablesTestNamespace: string;
  wbVariablesTestDescription: string;
  configMapYamlPath: string;
  secretYamlPath: string;
  MY_VAR2: string;
  MY_VAR1: string;
  FAKE_ID: string;
  FAKE_VALUE: string;
  FAKE_SECRET_KEY: string;
  FAKE_SECRET_VALUE: string;
  FAKE_CM_KEY: string;
  FAKE_CM_VALUE: string;
};

export type WBTolerationsTestData = {
  wbTolerationsTestNamespace: string;
  wbTolerationsTestDescription: string;
  workbenchName: string;
  resourceYamlPath: string;
  hardwareProfileName: string;
  tolerationValue: string;
  hardwareProfileDeploymentSize: string;
};

export type WBStatusTestData = {
  wbStatusTestNamespace: string;
  wbStatusTestDescription: string;
};

export type WBNegativeTestsData = {
  wbNegativeTestNamespace: string;
  invalidResourceNames: string[];
};

export type WBImagesTestData = {
  wbImagesTestNamespace: string;
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
  ODH_DASHBOARD_PROJECT_NAME: string;
  PIP_INDEX_URL: string;
  PIP_TRUSTED_HOST: string;
  NGC_API_KEY: string;
  OCI_SECRET_DETAILS_FILE: string;
  OCI_MODEL_URI: string;
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
  projectDCResourceName: string;
  projectPVStorageResourceName: string;
  pvStorageName: string;
  pvStorageDescription: string;
  pvStorageNameEdited: string;
  invalidResourceNames: string[];
};

export type NotebookImageData = {
  codeserverImageName: string;
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

export type HardwareProfilesData = {
  hardwareProfileName: string;
  hardwareProfileDescription: string;
  hardwareProfileEditedDescription: string;
};

export type NamespaceConfig = {
  APPLICATIONS_NAMESPACE: string;
};

enum OOTBConnectionTypes {
  s3 = 'S3 compatible object storage - v1',
  uri = 'URI - v1',
  oci = 'OCI compliant registry - v1',
}

export type OOTBConnectionTypesData = {
  s3: OOTBConnectionTypes.s3;
  uri: OOTBConnectionTypes.uri;
  oci: OOTBConnectionTypes.oci;
};

export type WorkloadMetricsTestData = {
  projectName: string;
  resourceFlavour: string;
  clusterQueue: string;
  localQueue: string;
  cpuQuota: number;
  memoryQuota: number;
  refreshIntervals: number[];
};

export type DeployOCIModelData = {
  projectName: string;
  connectionName: string;
  ociRegistryHost: string;
  modelDeploymentName: string;
};

export type ModelTolerationsTestData = {
  modelServingTolerationsTestNamespace: string;
  resourceYamlPath: string;
  hardwareProfileName: string;
  tolerationValue: string;
  hardwareProfileDeploymentSize: string;
  modelName: string;
  modelFilePath: string;
};

export type NotebookTolerationsTestData = {
  codeserverImageName: string;
  resourceYamlPath: string;
  hardwareProfileName: string;
  tolerationValue: string;
  hardwareProfileDeploymentSize: string;
};

export type RegisterModelTestData = {
  registryNamePrefix: string;
  // First model (Object Storage)
  objectStorageModelName: string;
  objectStorageModelDescription: string;
  version1Name: string;
  version1Description: string;
  modelFormatOnnx: string;
  formatVersion1_0: string;
  objectStorageEndpoint: string;
  objectStorageBucket: string;
  objectStorageRegion: string;
  objectStoragePath: string;
  // Second model (URI)
  uriModelName: string;
  uriModelDescription: string;
  uriVersion1Description: string;
  modelFormatPytorch: string;
  formatVersion2_0: string;
  uriPrimary: string;
  // New version registration (Versions view)
  version2Name: string;
  version2Description: string;
  modelFormatTensorflow: string;
  formatVersion3_0: string;
  uriVersion2: string;

  newNameSuffix: string;
  newDescription: string;
};

export enum AccessMode {
  RWO = 'ReadWriteOnce',
  RWX = 'ReadWriteMany',
  ROX = 'ReadOnlyMany',
  RWOP = 'ReadWriteOncePod',
}
