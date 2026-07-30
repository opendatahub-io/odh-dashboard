import * as React from 'react';
import {
  deployAgentWizardStepRegistry,
  type DeployAgentWizardStepConfig as DeployAgentWizardStepRegistryEntry,
} from './deployAgentWizardValidation';
import ConfigurationStep from './steps/ConfigurationStep';
import EnvironmentVariablesStep from './steps/EnvironmentVariablesStep';
import ImageSelectionStep from './steps/ImageSelectionStep';
import NetworkingStep from './steps/NetworkingStep';
import SummaryStep from './steps/SummaryStep';
import { DeployAgentWizardStepTitle } from './types';

export type DeployAgentWizardStepConfig = DeployAgentWizardStepRegistryEntry & {
  Component: React.FC;
};

const stepComponents: Record<DeployAgentWizardStepTitle, React.FC> = {
  [DeployAgentWizardStepTitle.IMAGE_SELECTION]: ImageSelectionStep,
  [DeployAgentWizardStepTitle.CONFIGURATION]: ConfigurationStep,
  [DeployAgentWizardStepTitle.NETWORKING]: NetworkingStep,
  [DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES]: EnvironmentVariablesStep,
  [DeployAgentWizardStepTitle.SUMMARY]: SummaryStep,
};

export const deployAgentWizardSteps: DeployAgentWizardStepConfig[] =
  deployAgentWizardStepRegistry.map((step) => ({
    ...step,
    Component: stepComponents[step.name],
  }));
