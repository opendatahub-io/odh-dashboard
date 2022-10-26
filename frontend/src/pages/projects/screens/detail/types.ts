export enum ProjectSectionID {
  WORKBENCHES = 'workbenches',
  CLUSTER_STORAGES = 'cluster-storages',
  DATA_CONNECTIONS = 'data-connections',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
