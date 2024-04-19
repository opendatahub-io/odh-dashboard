import { ProjectKind } from '~/k8sTypes';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

export const isAvailableProject = (projectName: string, dashboardNamespace: string): boolean =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    projectName === 'default' ||
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);
export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);
export const getProjectOwner = (project: ProjectKind): string =>
  project.metadata.annotations?.['openshift.io/requester'] || '';
export const getProjectCreationTime = (project: ProjectKind): number =>
  project.metadata.creationTimestamp ? new Date(project.metadata.creationTimestamp).getTime() : 0;
