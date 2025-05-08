import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelServingPlatformExtension = Extension<
  'model-serving.platform',
  {
    id: string;
    name: string;
    isInstalled: CodeRef<() => Promise<boolean>>;
    enable: CodeRef<(project: ProjectKind) => Promise<string>>;
    disable: CodeRef<(project: ProjectKind) => Promise<string>>;
    isEnabled: CodeRef<(project: ProjectKind) => boolean>;
  }
>;
export const isModelServingPlatform = (
  extension: Extension,
): extension is ModelServingPlatformExtension => extension.type === 'model-serving.platform';

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
