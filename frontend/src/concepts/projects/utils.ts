import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { KnownLabels } from '@odh-dashboard/k8s-core';

export const isAiProject = (project: ProjectKind): boolean => {
  return project.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true';
};

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

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared utility
export { namespaceToProjectDisplayName } from '@odh-dashboard/k8s-core';

export const projectDisplayNameToNamespace = (
  displayName: string,
  projects: ProjectKind[],
): string => {
  const project = projects.find(
    (p) => p.metadata.annotations?.['openshift.io/display-name'] === displayName,
  );
  return project?.metadata.name || displayName;
};
