export enum ProjectSectionID {
  OVERVIEW = 'overview',
  WORKBENCHES = 'workbenches',
  CLUSTER_STORAGES = 'cluster-storages',
  CONNECTIONS = 'connections',
  MODEL_SERVER = 'model-server',
  PIPELINES = 'pipelines-projects',
  PERMISSIONS = 'permissions',
  ROLES = 'roles',
  SETTINGS = 'settings',
  FEATURE_STORE = 'feature-store-integration',
  WORKBENCHES_V2 = 'workbenches-v2',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
