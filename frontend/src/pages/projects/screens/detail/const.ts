import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.OVERVIEW]: 'Overview',
  [ProjectSectionID.WORKBENCHES]: 'Workbenches',
  [ProjectSectionID.CLUSTER_STORAGES]: 'Cluster storage',
  [ProjectSectionID.CONNECTIONS]: 'Connections',
  [ProjectSectionID.MODEL_SERVER]: 'Deployments',
  [ProjectSectionID.PIPELINES]: 'Pipelines',
  [ProjectSectionID.PERMISSIONS]: 'Permissions',
  [ProjectSectionID.SETTINGS]: 'Settings',
  [ProjectSectionID.FEATURE_STORE]: 'Feature Store',
};

/**
 * Permission-related messages
 */
export const CREATE_WORKBENCH_DISABLED_MESSAGE =
  'To create a workbench, ask your administrator to adjust your permissions.';
