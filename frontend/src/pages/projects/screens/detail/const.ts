import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.WORKBENCHES]: 'Workbenches',
  [ProjectSectionID.CLUSTER_STORAGES]: 'Cluster storage',
  [ProjectSectionID.DATA_CONNECTIONS]: 'Data connections',
};

export const ProjectSectionTitlesExtended: ProjectSectionTitlesType = {
  ...ProjectSectionTitles,
  [ProjectSectionID.MODEL_SERVER]: 'Models and model servers',
};
