import { BUILD_PHASE, ImageStreamKind, ImageStreamSpecTagType } from '~/k8sTypes';

export enum SpawnerPageSectionID {
  NAME_DESCRIPTION = 'name-and-description',
  NOTEBOOK_IMAGE = 'notebook-image',
  DEPLOYMENT_SIZE = 'deployment-size',
  ENVIRONMENT_VARIABLES = 'environment-variables',
  CLUSTER_STORAGE = 'cluster-storage',
}

export type SpawnerPageSectionTitlesType = {
  [key in SpawnerPageSectionID]: string;
};

export type BuildStatus = {
  name: string;
  status: BUILD_PHASE;
  imageStreamVersion: string;
  timestamp?: string;
};

export type ImageVersionDependencyType = {
  name: string;
  version?: string;
};

export type ImageStreamSelectOptionObjectType = {
  imageStream: ImageStreamKind;
  toString: () => string;
};

export type ImageVersionSelectOptionObjectType = {
  imageVersion: ImageStreamSpecTagType;
  toString: () => string;
};

export type ImageVersionSelectDataType = {
  buildStatuses: BuildStatus[];
  imageStream?: ImageStreamKind;
  imageVersions: ImageStreamSpecTagType[];
};
