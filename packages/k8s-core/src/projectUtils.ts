import type { ProjectKind } from './k8sTypes';
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
type GetByName = (name?: string) => Parameters<Array<ProjectKind>['find']>[0];
export const byName: GetByName = (name) => (project) => project.metadata.name === name;

export const namespaceToProjectDisplayName = (
  namespace: string,
  projects: ProjectKind[],
): string => {
  const project = projects.find((p) => p.metadata.name === namespace);
  return project ? getDisplayNameFromK8sResource(project) : namespace;
};
