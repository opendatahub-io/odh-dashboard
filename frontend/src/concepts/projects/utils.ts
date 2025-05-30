import { ProjectKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

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

export const namespaceToProjectDisplayName = (
  namespace: string,
  projects: ProjectKind[],
): string => {
  const project = projects.find((p) => p.metadata.name === namespace);
  return project ? getDisplayNameFromK8sResource(project) : namespace;
};

export const projectDisplayNameToNamespace = (
  displayName: string,
  projects: ProjectKind[],
): string => {
  const project = projects.find(
    (p) => p.metadata.annotations?.['openshift.io/display-name'] === displayName,
  );
  return project?.metadata.name || displayName;
};
