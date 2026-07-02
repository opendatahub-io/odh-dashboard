import * as React from 'react';
import {
  createDeployAgentWizardValidationState,
  deployAgentWizardStepRegistry,
  isDeployAgentWizardStepAccessible,
  isDeployAgentWizardStepValid,
  type DeployAgentWizardValidationState,
} from './deployAgentWizardValidation';
import type { DeployAgentWizardFormData } from './types';

export type DeployAgentWizardValidation = DeployAgentWizardValidationState & {
  isStepAccessible: (stepIndex: number) => boolean;
  isCurrentStepValid: (stepIndex: number) => boolean;
  isNextStepDisabled: (stepIndex: number) => boolean;
};

export const useAgentDeployWizardValidation = (
  formData: DeployAgentWizardFormData,
): DeployAgentWizardValidation => {
  const validationState = React.useMemo(
    () => createDeployAgentWizardValidationState(formData),
    [formData],
  );

  const isStepAccessible = React.useCallback(
    (stepIndex: number): boolean =>
      isDeployAgentWizardStepAccessible(stepIndex, validationState, deployAgentWizardStepRegistry),
    [validationState],
  );

  const isCurrentStepValid = React.useCallback(
    (stepIndex: number): boolean =>
      isDeployAgentWizardStepValid(stepIndex, validationState, deployAgentWizardStepRegistry),
    [validationState],
  );

  const isNextStepDisabled = React.useCallback(
    (stepIndex: number): boolean => !isCurrentStepValid(stepIndex),
    [isCurrentStepValid],
  );

  return React.useMemo(
    () => ({
      ...validationState,
      isStepAccessible,
      isCurrentStepValid,
      isNextStepDisabled,
    }),
    [validationState, isStepAccessible, isCurrentStepValid, isNextStepDisabled],
  );
};
