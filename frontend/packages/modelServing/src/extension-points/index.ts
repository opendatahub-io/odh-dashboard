import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelServingPlatformExtension = Extension<
  'model-serving.platform',
  {
    id: string;
    name: string;
    manage: CodeRef<{
      isInstalled: () => Promise<boolean>;
      enable: (project: ProjectKind) => Promise<string>;
      isEnabled: (project: ProjectKind) => boolean;
    }>;
    enableCardText: {
      title: string;
      description: string;
      selectText: string;
      enabledText: string;
    };
    deployedModelsView: {
      startHintTitle: string;
      startHintDescription: string;
      deployButtonText: string;
    };
  }
>;
export const isModelServingPlatformExtension = (
  extension: Extension,
): extension is ModelServingPlatformExtension => extension.type === 'model-serving.platform';
