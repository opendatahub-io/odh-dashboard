import type { DeployAgentWizardFormData } from './types';
import { DeployAgentWizardStepTitle } from './types';
import {
  isServicePortRowValid,
  isSupportedDeployEnvVarRow,
  isValidAgentName,
  isValidK8sLabelValue,
  isValidPullSecretName,
} from './utils';

/** Computed validation flags shared by the step registry and submit flow. */
export type DeployAgentWizardValidationState = {
  isImageSelectionValid: boolean;
  isConfigurationValid: boolean;
  isNetworkingValid: boolean;
  isEnvironmentVariablesValid: boolean;
  isDeployFormValid: boolean;
};

export type DeployAgentWizardStepValidator = (state: DeployAgentWizardValidationState) => boolean;

const isNetworkingFormDataValid = (formData: DeployAgentWizardFormData): boolean =>
  formData.servicePorts.length > 0 && formData.servicePorts.every(isServicePortRowValid);

const isEnvironmentVariablesFormDataValid = (formData: DeployAgentWizardFormData): boolean => {
  if (formData.envVars.length === 0) {
    return true;
  }

  return formData.envVars.every(isSupportedDeployEnvVarRow);
};

export const createDeployAgentWizardValidationState = (
  formData: DeployAgentWizardFormData,
): DeployAgentWizardValidationState => {
  const isImageSelectionValid =
    formData.project.trim().length > 0 &&
    formData.containerImage.trim().length > 0 &&
    formData.imageTag.trim().length > 0 &&
    formData.agentName.trim().length > 0 &&
    isValidAgentName(formData.agentName) &&
    isValidPullSecretName(formData.pullSecret);

  const isConfigurationValid =
    Boolean(formData.protocol) && isValidK8sLabelValue(formData.framework);

  const isNetworkingValid = isNetworkingFormDataValid(formData);
  const isEnvironmentVariablesValid = isEnvironmentVariablesFormDataValid(formData);

  return {
    isImageSelectionValid,
    isConfigurationValid,
    isNetworkingValid,
    isEnvironmentVariablesValid,
    isDeployFormValid:
      isImageSelectionValid &&
      isConfigurationValid &&
      isNetworkingValid &&
      isEnvironmentVariablesValid,
  };
};

/** Step validators keyed by title — referenced from the step registry in deployAgentWizardSteps.tsx. */
export const deployAgentWizardStepValidators = {
  isImageSelectionStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isImageSelectionValid,
  isConfigurationStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isConfigurationValid,
  isNetworkingStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isNetworkingValid,
  isEnvironmentVariablesStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isEnvironmentVariablesValid,
  isSummaryStepValid: (state: DeployAgentWizardValidationState): boolean => state.isDeployFormValid,
} as const;

export type DeployAgentWizardStepConfig = {
  name: DeployAgentWizardStepTitle;
  id: string;
  isValid: DeployAgentWizardStepValidator;
};

/** Step metadata and validators — single source of truth for gating logic. */
export const deployAgentWizardStepRegistry: DeployAgentWizardStepConfig[] = [
  {
    name: DeployAgentWizardStepTitle.IMAGE_SELECTION,
    id: 'deploy-agent-image-selection-step',
    isValid: deployAgentWizardStepValidators.isImageSelectionStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.CONFIGURATION,
    id: 'deploy-agent-configuration-step',
    isValid: deployAgentWizardStepValidators.isConfigurationStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.NETWORKING,
    id: 'deploy-agent-networking-step',
    isValid: deployAgentWizardStepValidators.isNetworkingStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES,
    id: 'deploy-agent-environment-variables-step',
    isValid: deployAgentWizardStepValidators.isEnvironmentVariablesStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.SUMMARY,
    id: 'deploy-agent-summary-step',
    isValid: deployAgentWizardStepValidators.isSummaryStepValid,
  },
];

/** Whether the user may navigate to a wizard step (all prior steps must be valid). */
export const isDeployAgentWizardStepAccessible = (
  stepIndex: number,
  state: DeployAgentWizardValidationState,
  steps: Pick<DeployAgentWizardStepConfig, 'isValid'>[] = deployAgentWizardStepRegistry,
): boolean => {
  if (stepIndex < 1 || stepIndex > steps.length) {
    return false;
  }

  for (let i = 0; i < stepIndex - 1; i++) {
    const stepValidator = steps[i].isValid;
    if (!stepValidator(state)) {
      return false;
    }
  }
  return true;
};

/** Whether the active step passes validation (controls Next / Submit). */
export const isDeployAgentWizardStepValid = (
  stepIndex: number,
  state: DeployAgentWizardValidationState,
  steps: Pick<DeployAgentWizardStepConfig, 'isValid'>[] = deployAgentWizardStepRegistry,
): boolean => {
  if (stepIndex < 1 || stepIndex > steps.length) {
    return false;
  }
  const stepValidator = steps[stepIndex - 1].isValid;
  return stepValidator(state);
};
