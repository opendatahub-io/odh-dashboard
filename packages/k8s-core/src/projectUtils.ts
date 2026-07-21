import type { ProjectKind } from './k8sTypes';
import { KnownLabels } from './k8sTypes';
import { getDisplayNameFromK8sResource } from './k8sResourceUtils';

export enum NamespaceApplicationCase {
  /**
   * Supports the flow for when a project is created in the DSG create project flow.
   */
  DSG_CREATION,
  /**
   * Upgrade an existing DSG project to work with model kserve.
   */
  KSERVE_PROMOTION,
  /**
   * Nvidia NIMs run on KServe but have different requirements than regular models.
   */
  KSERVE_NIM_PROMOTION,
  /**
   * Reset a project's model serving platform configuration so the platform can be selected again.
   */
  RESET_MODEL_SERVING_PLATFORM,
}

/** Returns a predicate that matches a project by `metadata.name`. */
export type GetByName = (name?: string) => Parameters<Array<ProjectKind>['find']>[0];
export const byName: GetByName = (name) => (project) => project.metadata.name === name;

export const isAvailableProject = (projectName: string, dashboardNamespace: string): boolean =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    projectName === 'default' ||
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );

export const isAiProject = (project: ProjectKind): boolean =>
  project.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true';

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
