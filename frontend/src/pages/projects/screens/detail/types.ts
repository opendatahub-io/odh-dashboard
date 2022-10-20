export enum ProjectSectionID {
  WORKSPACES = 'workspaces',
  STORAGES = 'storages',
  DATA_CONNECTIONS = 'data-connections',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
