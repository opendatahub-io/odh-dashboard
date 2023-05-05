export enum ProjectSectionID {
  WORKBENCHES = 'workbenches',
  CLUSTER_STORAGES = 'cluster-storages',
  DATA_CONNECTIONS = 'data-connections',
  MODEL_SERVER = 'model-server',
  PIPELINES = 'pipelines-projects',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
