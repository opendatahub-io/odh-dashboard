export enum ProjectSectionID {
  WORKSPACE = 'data-science-workspaces',
  STORAGE = 'storage',
  DATA_CONNECTIONS = 'data-connections',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
