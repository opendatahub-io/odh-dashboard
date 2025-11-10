import React from 'react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { DeployPrefillData } from '@odh-dashboard/model-registry/model-catalog-deploy';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import { InitialWizardFormData, ModelLocationType } from '../src/components/deploymentWizard/types';
import { useNavigateToDeploymentWizard } from '../src/components/deploymentWizard/useNavigateToDeploymentWizard';

export const useNavigateToDeploymentWizardWithData = (
  deployPrefillData: DeployPrefillData,
): ((projectName?: string) => void) => {
  const resourceName = translateDisplayNameForK8s(deployPrefillData.modelName);
  const prefillInfo: InitialWizardFormData = React.useMemo(
    () => ({
      wizardStartIndex: deployPrefillData.wizardStartIndex ?? 1,
      modelLocationData: {
        type: ModelLocationType.NEW,
        fieldValues: {
          URI: deployPrefillData.modelUri,
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
        name: deployPrefillData.modelName,
        description: '',
        k8sName: {
          value: resourceName,
          state: {
            immutable: false,
            invalidCharacters: false,
            invalidLength: false,
            maxLength: 253,
            touched: false,
          },
        },
      },
    }),
    [deployPrefillData],
  );
  const navigationFunction = useNavigateToDeploymentWizard(
    null,
    prefillInfo,
    deployPrefillData.returnRouteValue,
  );
  return navigationFunction;
};
