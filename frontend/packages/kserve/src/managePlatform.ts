import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/k8s/projects';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';

const isInstalled = (): Promise<boolean> => Promise.resolve(true);

const isEnabled = (project: ProjectKind): boolean =>
  project.metadata.labels?.['modelmesh-enabled'] === 'false';

const enable = (project: ProjectKind): Promise<string> =>
  addSupportServingPlatformProject(
    project.metadata.name,
    NamespaceApplicationCase.KSERVE_PROMOTION,
  );

export default {
  isInstalled,
  isEnabled,
  enable,
};
