import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { InitialWizardFormData } from './extension-points/model-catalog-deploy';

export const extractExternalFormData = (
  modelUri: string,
  modelName: string,
): InitialWizardFormData | null => {
  if (!modelUri) return null;

  return {
    // Start wizard on step 2
    wizardStartIndex: 2,
    modelLocationData: {
      type: 'new',
      fieldValues: {
        URI: modelUri,
      },
      additionalFields: {},
      disableInputFields: true,
    },
    createConnectionData: {
        saveConnection: false,
        hideFields: true,
    },
    modelTypeField: ServingRuntimeModelType.GENERATIVE, 
    k8sNameDesc: {
      name: modelName,
      description: '',
      k8sName: {
        value: modelName,
        state: {
          immutable: false,
          invalidCharacters: false,
          invalidLength: false,
          maxLength: 253,
          touched: false,
        },
      },
    },
  };
};