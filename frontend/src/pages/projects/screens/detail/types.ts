export enum ProjectSectionID {
  WORKBENCHES = 'workbenches',
  STORAGES = 'storages',
  DATA_CONNECTIONS = 'data-connections',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
