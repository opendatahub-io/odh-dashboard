import { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';

export type ModelServingPlatformExtension = Extension<
  'model-serving.platform',
  {
    id: string;
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      enabledLabel: string;
      enabledLabelValue: string;
    };
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
