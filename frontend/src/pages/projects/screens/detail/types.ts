export enum ProjectSectionID {
  WORKBENCHES = 'workbenches',
  CLUSTER_STORAGES = 'cluster-storages',
  DATA_CONNECTIONS = 'data-connections',
  MODEL_SERVER = 'model-server',
  PIPELINES = 'pipelines',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
