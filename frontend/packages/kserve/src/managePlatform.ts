import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/k8s/projects';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';

export const isInstalled = (): Promise<boolean> => Promise.resolve(true);

export const isEnabled = (project: ProjectKind): boolean =>
  project.metadata.labels?.['modelmesh-enabled'] === 'false';

export const enable = (project: ProjectKind): Promise<string> =>
  addSupportServingPlatformProject(
    project.metadata.name,
    NamespaceApplicationCase.KSERVE_PROMOTION,
  );

export const disable = (project: ProjectKind): Promise<string> =>
  addSupportServingPlatformProject(
    project.metadata.name,
    NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
  );
