import React from 'react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { DeployPrefillData } from '@odh-dashboard/model-registry/model-catalog-deploy';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import {
  ConnectionTypeRefs,
  InitialWizardFormData,
  ModelLocationType,
} from '../src/components/deploymentWizard/types';
import { useNavigateToDeploymentWizard } from '../src/components/deploymentWizard/useNavigateToDeploymentWizard';

export const useNavigateToDeploymentWizardWithData = (
  deployPrefillData: DeployPrefillData,
): ((projectName?: string) => void) => {
  const resourceName = translateDisplayNameForK8s(deployPrefillData.modelName);

  const [connectionTypes, connectionTypesLoaded] = useWatchConnectionTypes(true);
  const uri = deployPrefillData.modelUri;
  let connectionTypeName = ConnectionTypeRefs.URI;

  // Handling S3, URI, and OCI URIs
  if (uri && typeof uri === 'string') {
    const uriProtocol = uri.split('://')[0].toLowerCase();
    if (uriProtocol === 's3') {
      connectionTypeName = ConnectionTypeRefs.S3;
    }
  }
  const connectionTypeObject = React.useMemo(() => {
    return connectionTypes.find((ct) => ct.metadata.name === connectionTypeName);
  }, [connectionTypes, connectionTypeName, connectionTypesLoaded]);

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
        connectionTypeObject,
      },
      createConnectionData: {
        saveConnection: false,
        hideFields: true,
      },
      modelTypeField: deployPrefillData.modelType ?? ServingRuntimeModelType.GENERATIVE,
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
    deployPrefillData.cancelReturnRouteValue,
  );
  return navigationFunction;
};
