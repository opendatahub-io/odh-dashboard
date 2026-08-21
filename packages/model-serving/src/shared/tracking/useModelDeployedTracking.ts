import React from 'react';
import { useLocation } from 'react-router-dom';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireModelDeployed as fireDeploymentFormTracking,
  type DeploymentTrackingProperties,
} from './deploymentTracking';
import {
  getDeployWizardNavState,
  getModelDeployedTrackingProperties,
  type ModelDeployedTrackingProperties,
} from './deployWizardTracking';
import { useWizardTrackingProperties } from './useWizardTrackingProperties';
import {
  getCapabilityCounts,
  type ModelDeployedCapabilityProperties,
} from './modelCapabilitiesTracking';
import { MODEL_CAPABILITIES_FIELD_ID } from '../../components/deploymentWizard/fields/modelCapabilities/ModelCapabilitiesField';
import type { WizardFormState } from '../../components/deploymentWizard/useDeploymentWizardReducer';
import type { InitialWizardFormData } from '../types/form-data';

export const getBaseModelDeployedTrackingProperties = (
  formState: WizardFormState,
): Omit<DeploymentTrackingProperties, 'outcome' | 'success' | 'error'> &
  ModelDeployedCapabilityProperties => {
  const serverTemplateName = formState.modelServer?.data?.selection?.name;
  const capabilitiesRaw: unknown = formState[MODEL_CAPABILITIES_FIELD_ID];
  const capabilities: string[] = Array.isArray(capabilitiesRaw) ? capabilitiesRaw : [];
  return {
    modelType: formState.modelType.data?.type,
    runtime: serverTemplateName,
    servingRuntimeName: formState.modelServer?.data?.selection?.label,
    servingRuntimeFormat: formState.modelFormatState.modelFormat?.name,
    numReplicas: formState.numReplicas.data ?? undefined,
    modelLocationType: formState.modelLocationData.data?.type,
    ...getCapabilityCounts(capabilities),
  };
};

const toDeploymentTrackingProperties = (
  properties: ModelDeployedTrackingProperties,
  errorMessage?: string,
): DeploymentTrackingProperties => {
  const trackingProperties: DeploymentTrackingProperties = {
    outcome: properties.outcome === 'cancel' ? TrackingOutcome.cancel : TrackingOutcome.submit,
    success: properties.success,
  };

  if (errorMessage) {
    trackingProperties.errorMessage = errorMessage;
    trackingProperties.error = errorMessage;
  }

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'outcome' || value === undefined) {
      continue;
    }
    trackingProperties[key] = Array.isArray(value) ? value.join(',') : value;
  }

  return trackingProperties;
};

export const useModelDeployedTracking = (
  formState: WizardFormState,
  initialWizardData?: InitialWizardFormData,
  platformId?: string,
): {
  fireModelDeployedTracking: (
    outcome: 'submit' | 'cancel',
    success?: boolean,
    errorMessage?: string,
  ) => Promise<void>;
} => {
  const location = useLocation();
  const { getTrackingProperties } = useWizardTrackingProperties(formState, platformId);

  const fireModelDeployedTracking = React.useCallback(
    async (outcome: 'submit' | 'cancel', success?: boolean, errorMessage?: string) => {
      const platformTrackingProperties = await getTrackingProperties();
      const wizardProperties = getModelDeployedTrackingProperties({
        navState: getDeployWizardNavState(location.state),
        validatedConfigurations: initialWizardData?.validatedConfigurations,
        selectedValidatedConfigurations:
          formState.validatedConfigurationSelection.selectedValidatedConfigurations,
        runtimeArgs: formState.runtimeArgs.data?.args,
        outcome,
        success,
        error: errorMessage,
        additionalProperties: {
          ...getBaseModelDeployedTrackingProperties(formState),
          ...platformTrackingProperties,
          ...(errorMessage ? { errorMessage } : {}),
        },
      });

      fireDeploymentFormTracking(toDeploymentTrackingProperties(wizardProperties, errorMessage));
    },
    [location.state, initialWizardData?.validatedConfigurations, formState, getTrackingProperties],
  );

  return { fireModelDeployedTracking };
};
