import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import { Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelServingPlatform = Extension<
  'model-serving.platform',
  {
    id: string;
    name: string;
    isInstalled: () => Promise<boolean>;
    enable: (project: ProjectKind) => Promise<string>;
    disable: (project: ProjectKind) => Promise<string>;
    isEnabled: (project: ProjectKind) => boolean;
  }
>;
export const isModelServingPlatform = (extension: Extension): extension is ModelServingPlatform =>
  extension.type === 'model-serving.platform';

export type ModelServingPlatformCard = Extension<
  'model-serving.platform/card',
  {
    platform: string;
    title: string;
    description: string;
    selectText: string;
  }
>;
export const isModelServingPlatformCard = (
  extension: Extension,
): extension is ModelServingPlatformCard => extension.type === 'model-serving.platform/card';
