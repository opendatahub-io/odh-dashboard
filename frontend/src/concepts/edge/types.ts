import { BreadcrumbItem } from '@patternfly/react-core';
import {
  K8sCondition,
  PipelineKind,
  PipelineRunTaskRunStatus,
  PipelineRunKind,
  PipelineTask,
} from '~/k8sTypes';
import { ContextResourceData } from '~/types';
import { createNode } from '~/concepts/topology';
import { EnvVariableDataEntry } from '~/pages/projects/types';

export enum IMAGE_REGISTRY_CREDENTIALS_KEYS {
  USERNAME = 'username',
  PASSWORD = 'password',
}

export type EdgeModelPipelineSecretWorkspace = {
  name: EdgeModelPipelineKnownWorkspaces.S3_SECRET;
  secret: {
    secretName: string;
  };
};

export type EdgeModelPipelineTestDataWorkspace = {
  name: EdgeModelPipelineKnownWorkspaces.TEST_DATA;
  configMap: {
    name: string;
  };
};

export enum EdgeModelPipelineKnownResults {
  TARGET_REGISTRY_URL = 'target-registry-url',
  IMAGE_SHA = 'image-sha',
}

export enum EdgeModelPipelineKnownWorkspaces {
  S3_SECRET = 's3-secret',
  TEST_DATA = 'test-data',
}

export enum EdgeModelLocationType {
  S3 = 's3',
  GIT = 'git',
}

export type EdgeModelRun = {
  run: PipelineRunKind;
  status?: K8sCondition;
  containerImageUrl?: string;
  modelName: string;
  version: string;
};

export type EdgeModelVersion = {
  version: string;
  modelName: string;
  latestRun: EdgeModelRun;
  latestSuccessfulRun?: EdgeModelRun;
  runs: EdgeModelRun[];
};

export type EdgeModelParams = {
  modelName: string; // assuming this is unique
  modelVersion: string;
  s3BucketName?: string;
  containerFileRelativePath?: string;
  modelRelativePath?: string;
  fetchModel: 'git' | 's3';
  gitModelRepo?: string;
  gitRevision?: string;
  targetImageRepo?: string;
  testEndpoint: string;
};

export type EdgeModel = {
  params: EdgeModelParams;
  s3SecretName?: string;
  versions: { [key: string]: EdgeModelVersion };
  latestRun: EdgeModelRun;
  pipelineName?: string;
};

export type EdgeContextState = {
  models: ContextResourceData<EdgeModel>;
  pipelines: ContextResourceData<PipelineKind>;
  taskRunStatuses: { [key: string]: K8sCondition };
  refreshAll: () => void;
};

export type EdgePipelineDetailsType = {
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
};

export type PipelineTaskRunDetails = {
  runID: string;
} & PipelineRunTaskRunStatus;

export type PipelineTaskDetails = {
  runDetails?: PipelineTaskRunDetails;
} & PipelineTask;

export type TaskReferenceMap = Record<string, PipelineTaskDetails>;

export type PipelineTaskTopology = {
  taskMap: TaskReferenceMap;
  nodes: ReturnType<typeof createNode>[];
};

export type EdgeModelState = {
  name: string;
  version?: string;
  modelInferencingEndpoint: string;
  s3Location: EnvVariableDataEntry[];
  locationType: EdgeModelLocationType;
  testDataResource: string;
  outputImageURL: string;
  gitModelRepo?: string;
  gitRevision?: string;
  modelRelativePath: string;
  s3BucketName: string;
};

export enum CreateRunCompletionType {
  OVERWRITE, // Overwrite the existing run
  INCREMENT, // Increment the existing run
}
