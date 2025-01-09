export enum ProjectSectionID {
  OVERVIEW = 'overview',
  WORKBENCHES = 'workbenches',
  EXPERIMENTS_AND_RUNS = 'experiments-and-runs',
  RUNS = 'uns',
  EXECUTIONS = 'executions',
  ARTIFACTS = 'artifacts',
  DISTRIBUTED_WORKLOADS = 'distributed-workloads',
  MODEL_DEPLOYMENTS = 'model-deployments',
  MODEL_SERVER = 'model-server',
  PIPELINES = 'pipelines',
  CONNECTIONS = 'connections',
  CLUSTER_STORAGES = 'cluster-storages',
  PERMISSIONS = 'permissions',
  SETTINGS = 'settings',
  DATA_CONNECTIONS = 'data-connections',
  GENERAL_SETTINGS = 'general-settings',
  ENVIRONMENT_SETUP = 'environment-setup',
  MODEL_SETUP = 'model-setup',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
