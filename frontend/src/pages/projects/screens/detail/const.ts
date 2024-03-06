import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectSectionID, ProjectSectionTitlesType } from './types';

export const ProjectSectionTitles: ProjectSectionTitlesType = {
  [ProjectSectionID.WORKBENCHES]: 'Workbenches',
  [ProjectSectionID.CLUSTER_STORAGES]: 'Cluster storage',
  [ProjectSectionID.DATA_CONNECTIONS]: 'Data connections',
  [ProjectSectionID.MODEL_SERVER]: 'Models and model servers',
  [ProjectSectionID.PIPELINES]: 'Pipelines',
};

export const AccessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};
