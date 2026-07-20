import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

export const getInferenceServiceProjectDisplayName = (
  is: InferenceServiceKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === is.metadata.namespace);
  return project ? getDisplayNameFromK8sResource(project) : 'Unknown';
};
