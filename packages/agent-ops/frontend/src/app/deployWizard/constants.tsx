import * as React from 'react';
import {
  deployAgentWizardStepRegistry,
  type DeployAgentWizardStepConfig as DeployAgentWizardStepRegistryEntry,
} from './deployAgentWizardValidation';
import ConfigurationStep from './steps/ConfigurationStep';
import ImageSelectionStep from './steps/ImageSelectionStep';
import PlaceholderStep from './steps/PlaceholderStep';
import { DeployAgentWizardStepTitle } from './types';

export type DeployAgentWizardStepConfig = DeployAgentWizardStepRegistryEntry & {
  Component: React.FC;
};

const placeholderStep = (title: DeployAgentWizardStepTitle): React.FC => {
  const PlaceholderWizardStep: React.FC = () => <PlaceholderStep title={title} />;
  PlaceholderWizardStep.displayName = `PlaceholderStep(${title})`;
  return PlaceholderWizardStep;
};

const stepComponents: Record<DeployAgentWizardStepTitle, React.FC> = {
  [DeployAgentWizardStepTitle.IMAGE_SELECTION]: ImageSelectionStep,
  [DeployAgentWizardStepTitle.CONFIGURATION]: ConfigurationStep,
  [DeployAgentWizardStepTitle.NETWORKING]: placeholderStep(DeployAgentWizardStepTitle.NETWORKING),
  [DeployAgentWizardStepTitle.SECURITY_AND_IDENTITY]: placeholderStep(
    DeployAgentWizardStepTitle.SECURITY_AND_IDENTITY,
  ),
  [DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES]: placeholderStep(
    DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES,
  ),
  [DeployAgentWizardStepTitle.SUMMARY]: placeholderStep(DeployAgentWizardStepTitle.SUMMARY),
};

export const deployAgentWizardSteps: DeployAgentWizardStepConfig[] =
  deployAgentWizardStepRegistry.map((step) => ({
    ...step,
    Component: stepComponents[step.name],
  }));
