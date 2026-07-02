import type { DeployAgentWizardFormData } from './types';
import { DeployAgentWizardStepTitle } from './types';
import { isValidAgentName, isValidK8sStorageQuantity, isValidPullSecretName } from './utils';

/** Computed validation flags shared by the step registry and submit flow. */
export type DeployAgentWizardValidationState = {
  isImageSelectionValid: boolean;
  isConfigurationValid: boolean;
  isDeployFormValid: boolean;
};

export type DeployAgentWizardStepValidator = (state: DeployAgentWizardValidationState) => boolean;

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
    Boolean(formData.protocol && formData.workloadType) &&
    (!formData.enablePersistentStorage || isValidK8sStorageQuantity(formData.persistentVolumeSize));

  return {
    isImageSelectionValid,
    isConfigurationValid,
    isDeployFormValid: isImageSelectionValid && isConfigurationValid,
  };
};

/** Step validators keyed by title — referenced from the step registry in constants.tsx. */
export const deployAgentWizardStepValidators = {
  isImageSelectionStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isImageSelectionValid,
  isConfigurationStepValid: (state: DeployAgentWizardValidationState): boolean =>
    state.isConfigurationValid,
  isPlaceholderStepValid: (): boolean => true,
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
    isValid: deployAgentWizardStepValidators.isPlaceholderStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.SECURITY_AND_IDENTITY,
    id: 'deploy-agent-security-and-identity-step',
    isValid: deployAgentWizardStepValidators.isPlaceholderStepValid,
  },
  {
    name: DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES,
    id: 'deploy-agent-environment-variables-step',
    isValid: deployAgentWizardStepValidators.isPlaceholderStepValid,
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
    if (!steps[i]?.isValid(state)) {
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
  return steps[stepIndex - 1]?.isValid(state) ?? false;
};
