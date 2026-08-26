import { isAiProject, KnownLabels, type ProjectKind } from '@odh-dashboard/k8s-core';

export const isNonKueueManagedDataScienceProject = (project: ProjectKind): boolean =>
  isAiProject(project) && project.metadata.labels?.[KnownLabels.KUEUE_MANAGED] !== 'true';

export const getNonKueueManagedDataScienceProjects = (projects: ProjectKind[]): ProjectKind[] =>
  projects.filter(isNonKueueManagedDataScienceProject);
