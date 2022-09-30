import { BUILD_PHASE, ImageStreamKind, ImageStreamSpecTagType } from '../../../../k8sTypes';

export enum SpawnerPageSectionID {
  NAME_DESCRIPTION = 'name-and-description',
  NOTEBOOK_IMAGE = 'notebook-image',
  DEPLOYMENT_SIZE = 'deployment-size',
  ENVIRONMENT_VARIABLES = 'environment-variables',
  STORAGE = 'storage',
}

export type SpawnerPageSectionTitlesType = {
  [key in SpawnerPageSectionID]: string;
};

export type NameDescType = {
  name: string;
  description: string;
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

export type ImageStreamSelectDataType = {
  buildStatuses: BuildStatus[];
  imageOptions: ImageStreamSelectOptionObjectType[];
};

export type ImageVersionSelectDataType = {
  buildStatuses: BuildStatus[];
  imageStream?: ImageStreamKind;
  versionOptions: ImageVersionSelectOptionObjectType[];
};
