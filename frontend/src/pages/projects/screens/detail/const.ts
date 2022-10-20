import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.WORKSPACE]: 'Data science workspaces',
  [ProjectSectionID.STORAGE]: 'Storage',
  [ProjectSectionID.DATA_CONNECTIONS]: 'Data connections',
};

export const ProjectSectionTitlesExtended: ProjectSectionTitlesType = {
  ...ProjectSectionTitles,
  [ProjectSectionID.MODEL_SERVER]: 'Model server',
};
