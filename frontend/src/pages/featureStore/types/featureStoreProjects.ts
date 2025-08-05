import { K8sAPIOptions } from '#~/k8sTypes';
import { FeatureStoreMeta, FeatureStorePagination } from './global';

export type FeatureStoreProject = {
  spec: {
    name: string;
  };
  meta: FeatureStoreMeta;
};

export type ProjectList = {
  projects: FeatureStoreProject[];
  pagination: FeatureStorePagination;
};

export type FeatureStoreRelationship = {
  source: {
    type: string;
    name: string;
  };
  target: {
    type: string;
    name: string;
  };
};

export type GetProjects = (opts: K8sAPIOptions) => Promise<ProjectList>;
