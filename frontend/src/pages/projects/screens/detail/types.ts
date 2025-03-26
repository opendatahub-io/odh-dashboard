export enum ProjectSectionID {
  OVERVIEW = 'overview',
  WORKBENCHES = 'workbenches',
  CLUSTER_STORAGES = 'cluster-storages',
  CONNECTIONS = 'connections',
  MODEL_SERVER = 'model-server',
  PIPELINES = 'pipelines-projects',
  PERMISSIONS = 'permissions',
  SETTINGS = 'settings',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
