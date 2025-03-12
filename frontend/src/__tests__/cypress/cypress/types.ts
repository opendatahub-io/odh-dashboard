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
  PIP_INDEX_URL: string;
  PIP_TRUSTED_HOST: string;
  NGC_API_KEY: string;
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

export type WorkloadMetricsTestData = {
  projectName: string;
  resourceFlavour: string;
  clusterQueue: string;
  localQueue: string;
  cpuQuota: number;
  memoryQuota: number;
  refreshIntervals: number[];
};

export enum HyperparameterFields {
  SDG_SAMPLE_SIZE = 'sdg_sample_size',
  SDG_SCALE_FACTOR = 'sdg_scale_factor',
  MAXIMUM_TOKENS_PER_ACCELERATOR = 'train_max_batch_len',
  TRAINING_WORKERS = 'train_num_workers',
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

export enum NonDisplayedHyperparameterFields {
  OUTPUT_OCI_MODEL_URI = 'output_oci_model_uri',
  OUTPUT_OCI_REGISTRY_SECRET = 'output_oci_registry_secret',
  OUTPUT_MODEL_NAME = 'output_model_name',
  OUTPUT_MODEL_VERSION = 'output-model_version',
  OUTPUT_MODEL_REGISTRY_API_URL = 'output_model_registry_api_url',
  OUTPUT_MODEL_REGISTRY_NAME = 'output_model_registry_name',
  OUTPUT_MODELCAR_BASE_IMAGE = 'output_modelcar_base_image',
  SDG_SECRET_URL = 'sdg_repo_url',
  SDG_REPO_SECRET = 'sdg_repo_secret',
  SDG_REPO_BRANCH = 'sdg_repo_branch',
  SDG_TEACHER_SECRET = 'sdg_teacher_secret',
  SDG_BASE_MODEL = 'sdg_base_model',
  TRAIN_TOLERATIONS = 'train_tolerations',
  TRAIN_NODE_SELECTORS = 'train_node_selectors',
  TRAIN_GPU_IDENTIFIER = 'train_gpu_identifier',
  TRAIN_GPU_PER_WORKER = 'train_gpu_per_worker',
  TRAIN_CPU_PER_WORKER = 'train_cpu_per_worker',
  TRAIN_MEMORY_PER_WORKER = 'train_memory_per_worker',
  EVAL_JUDGE_SECRET = 'eval_judge_secret',
  SDG_PIPELINE = 'sdg_pipeline',
  EVAL_GPU_IDENTIFIER = 'eval_gpu_identifier',
  K8S_STORAGE_CLASS_NAME = 'k8s_storage_class_name',
}
