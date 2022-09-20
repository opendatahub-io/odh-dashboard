export enum ProjectSectionID {
  WORKSPACE = 'data-science-workspaces',
  STORAGE = 'storage',
  DATA_CONNECTIONS = 'data-connections',
  MODEL_SERVING = 'model-serving',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]: string;
};
