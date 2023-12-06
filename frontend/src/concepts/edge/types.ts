import { PipelineRunKind } from '~/k8sTypes';
import { ContextResourceData } from '~/types';

export enum IMAGE_REGISTRY_CREDENTIALS_KEYS {
  USERNAME = 'username',
  PASSWORD = 'password',
}

export type EdgeModelPipelineS3SecretWorkspace = {
  name: 's3-secret';
  secret: {
    secretName: string;
  };
};

export enum EdgeModelPipelineKnownResults {
  TARGET_REGISTRY_URL = 'target-registry-url',
  IMAGE_SHA = 'image-sha',
}

export enum EdgeModelLocationType {
  S3 = 's3',
  GIT = 'git',
}

export type EdgeModelRun = {
  run: PipelineRunKind;
  status: string; // or more detailed status type
  containerImageUrl?: string;
};

export type EdgeModelVersion = {
  version: string;
  latestSuccessfulImageUrl?: string;
  runs: EdgeModelRun[];
};

export type EdgeModelParams = {
  modelName: string;
  modelVersion: string;
  s3BucketName?: string;
  gitServer?: string;
  gitOrgName?: string;
  gitRepoName?: string;
  containerfileRelativePath?: string;
  modelRelativePath?: string;
  fetchModel: 'git' | 's3';
  gitModelRepo?: string;
  gitRevision?: string;
  testEndpoint?: string;
  targetNamespace?: string;
  targetImagerepo?: string;
};

export type EdgeModel = {
  params: EdgeModelParams;
  // containerImageSecretName: string;
  s3SecretName?: string;
  versions: Record<string, EdgeModelVersion>;
  latestRun?: EdgeModelRun;
};

export type EdgeContextState = {
  models: ContextResourceData<EdgeModel>;
  refreshAll: () => void;
};
