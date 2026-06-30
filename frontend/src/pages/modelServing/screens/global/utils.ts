import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { InferenceServiceKind } from '#~/k8sTypes';

export const getInferenceServiceProjectDisplayName = (
  is: InferenceServiceKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === is.metadata.namespace);
  return project ? getDisplayNameFromK8sResource(project) : 'Unknown';
};
