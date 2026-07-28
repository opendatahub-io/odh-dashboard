import { K8sAPIOptions } from '@odh-dashboard/k8s-core';
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

export type GetProjects = (opts: K8sAPIOptions) => Promise<ProjectList>;
