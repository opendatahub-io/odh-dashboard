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

export enum IMAGE_REGISTRY_CREDENTIALS_KEYS {
  USERNAME = 'username',
  PASSWORD = 'password',
}

export type EdgeModelPipelineSecretWorkspace = {
  name:
    | EdgeModelPipelineKnownWorkspaces.S3_SECRET
    | EdgeModelPipelineKnownWorkspaces.GIT_BASIC_AUTH;
  secret: {
    secretName: string;
  };
};

export enum EdgeModelPipelineKnownResults {
  TARGET_REGISTRY_URL = 'target-registry-url',
  IMAGE_SHA = 'image-sha',
}

export enum EdgeModelPipelineKnownWorkspaces {
  S3_SECRET = 's3-secret',
  GIT_BASIC_AUTH = 'git-basic-auth',
}

export enum EdgeModelLocationType {
  S3 = 's3',
  GIT = 'git',
}

export type EdgeModelRun = {
  run: PipelineRunKind;
  status?: K8sCondition; // or more detailed status type
  containerImageUrl?: string;
  modelName: string;
  version: string;
};

export type EdgeModelVersion = {
  version: string;
  latestSuccessfulImageUrl?: string;
  runs: EdgeModelRun[];
  modelName: string;
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
};

export type EdgeModel = {
  params: EdgeModelParams;
  gitBasicAuthSecretName?: string;
  s3SecretName?: string;
  versions: { [key: string]: EdgeModelVersion };
  latestRun: EdgeModelRun;
  pipelineName?: string;
};

export type EdgeContextState = {
  models: ContextResourceData<EdgeModel>;
  pipelines: ContextResourceData<PipelineKind>;
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
