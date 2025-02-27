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
  tolerationValue: string;
  tolerationValueUpdate: string;
  workbenchName2: string;
};

export type WBStatusTestData = {
  wbStatusTestNamespace: string;
  wbStatusTestDescription: string;
};

export type WBNegativeTestsData = {
  wbNegativeTestNamespace: string;
  invalidResourceNames: string[];
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

enum OOTBConnectionTypes {
  s3 = 'S3 compatible object storage - v1',
  uri = 'URI - v1',
}

export type OOTBConnectionTypesData = {
  s3: OOTBConnectionTypes.s3;
  uri: OOTBConnectionTypes.uri;
};

export enum HyperparameterFields {
  SDG_SAMPLE_SIZE = 'sdg_sample_size',
  SDG_SCALE_FACTOR = 'sdg_scale_factor',
  MAXIMUM_TOKENS_PER_ACCELERATOR = 'train_max_batch_len',
  TRAINING_WORKERS = 'train_nnodes',
  TRAIN_NUM_EPOCHS_PHASE_1 = 'train_num_epochs_phase_1',
  TRAIN_NUM_EPOCHS_PHASE_2 = 'train_num_epochs_phase_2',
  BATCH_SIZE_PHASE_1 = 'train_effective_batch_size_phase_1',
  BATCH_SIZE_PHASE_2 = 'train_effective_batch_size_phase_2',
  LEARNING_RATE_PHASE_1 = 'train_learning_rate_phase_1',
  LEARNING_RATE_PHASE_2 = 'train_learning_rate_phase_2',
  WARMUP_STEPS_PHASE_1 = 'train_num_warmup_steps_phase_1',
  WARMUP_STEPS_PHASE_2 = 'train_num_warmup_steps_phase_2',
  MAXIMUM_BATCH_LENGTH = 'sdg_max_batch_len',
  TRAINING_SEED = 'train_seed',
  QUESTION_ANSWER_PAIRS = 'final_eval_few_shots',
  EVALUATION_WORKERS = 'final_eval_max_workers',
  EVALUATION_BATCH_SIZE = 'final_eval_batch_size',
}

export const HYPERPARAMETER_DISPLAY_NAMES: Record<HyperparameterFields, string> = {
  [HyperparameterFields.SDG_SCALE_FACTOR]: 'SDG scale factor',
  [HyperparameterFields.MAXIMUM_TOKENS_PER_ACCELERATOR]: 'Maximum tokens per accelerator',
  [HyperparameterFields.SDG_SAMPLE_SIZE]: 'SDG skill recipe sample size',
  [HyperparameterFields.TRAINING_WORKERS]: 'Training workers',
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_1]: 'Epochs (phase 1)',
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_2]: 'Epochs (phase 2)',
  [HyperparameterFields.BATCH_SIZE_PHASE_1]: 'Batch size (phase 1)',
  [HyperparameterFields.BATCH_SIZE_PHASE_2]: 'Batch size (phase 2)',
  [HyperparameterFields.LEARNING_RATE_PHASE_1]: 'Learning rate (phase 1)',
  [HyperparameterFields.LEARNING_RATE_PHASE_2]: 'Learning rate (phase 2)',
  [HyperparameterFields.WARMUP_STEPS_PHASE_1]: 'Warmup steps (phase 1)',
  [HyperparameterFields.WARMUP_STEPS_PHASE_2]: 'Warmup steps (phase 2)',
  [HyperparameterFields.MAXIMUM_BATCH_LENGTH]: 'Maximum batch length',
  [HyperparameterFields.TRAINING_SEED]: 'Training seed',
  [HyperparameterFields.QUESTION_ANSWER_PAIRS]: 'Question-answer pairs',
  [HyperparameterFields.EVALUATION_WORKERS]: 'Evaluation workers',
  [HyperparameterFields.EVALUATION_BATCH_SIZE]: 'Evaluation batch size',
};
