import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.OVERVIEW]: 'Overview',
  [ProjectSectionID.WORKBENCHES]: 'Workbenches',
  [ProjectSectionID.CLUSTER_STORAGES]: 'Cluster storage',
  [ProjectSectionID.DATA_CONNECTIONS]: 'Data connections',
  [ProjectSectionID.MODEL_SERVER]: 'Models and model servers',
  [ProjectSectionID.PIPELINES]: 'Pipelines',
  [ProjectSectionID.PERMISSIONS]: 'Permissions',
  [ProjectSectionID.SETTINGS]: 'Settings',
};

export const AccessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};
