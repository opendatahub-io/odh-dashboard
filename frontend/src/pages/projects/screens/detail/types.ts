export enum ProjectSectionID {
  WORKBENCHES = 'workbenches',
  STORAGES = 'storages',
  DATA_CONNECTIONS = 'data-connections',
  MODEL_SERVER = 'model-server',
}

export type ProjectSectionTitlesType = {
  [key in ProjectSectionID]?: string;
};
