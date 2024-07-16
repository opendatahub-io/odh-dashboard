import { ProjectKind } from '~/k8sTypes';

export const isAvailableProject = (projectName: string, dashboardNamespace: string): boolean =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    projectName === 'default' ||
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );

export const getProjectOwner = (project: ProjectKind): string =>
  project.metadata.annotations?.['openshift.io/requester'] || '';
export const getProjectCreationTime = (project: ProjectKind): number =>
  project.metadata.creationTimestamp ? new Date(project.metadata.creationTimestamp).getTime() : 0;
