import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getDeploymentWizardExitRoute } from './utils';

import { useModelDeploymentWizard, type ModelDeploymentWizardData } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { WizardFooterWithDisablingNext } from './WizardFooterWithDisablingNext';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: ModelDeploymentWizardData;
  project: ProjectKind;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const exitWizard = React.useCallback(() => {
    navigate(getDeploymentWizardExitRoute(location.pathname));
  }, [navigate, location.pathname]);

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <ModelDeploymentWizardContent
        primaryButtonText={primaryButtonText}
        existingData={existingData}
        project={project}
        exitWizard={exitWizard}
      />
    </ApplicationsPage>
  );
};

type ModelDeploymentWizardContentProps = {
  primaryButtonText: string;
  existingData?: ModelDeploymentWizardData;
  project: ProjectKind;
  exitWizard: () => void;
};
const ModelDeploymentWizardContent: React.FC<ModelDeploymentWizardContentProps> = ({
  primaryButtonText,
  existingData,
  project,
  exitWizard,
}) => {
  const wizardState = useModelDeploymentWizard(existingData);
  const validation = useModelDeploymentWizardValidation(wizardState.state);

  return (
    <Wizard onClose={exitWizard} onSave={exitWizard} footer={<WizardFooterWithDisablingNext />}>
      <WizardStep name="Source model" id="source-model-step">
        <ModelSourceStepContent wizardState={wizardState} validation={validation.modelSource} />
      </WizardStep>
      <WizardStep
        name="Model deployment"
        id="model-deployment-step"
        isDisabled={!validation.isModelSourceStepValid}
      >
        <ModelDeploymentStepContent projectName={project.metadata.name} wizardState={wizardState} />
      </WizardStep>
      <WizardStep
        name="Advanced options"
        id="advanced-options-step"
        isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
      >
        Step 3 content
      </WizardStep>
      <WizardStep
        name="Summary"
        id="summary-step"
        footer={{ nextButtonText: primaryButtonText }}
        isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
      >
        Review step content
      </WizardStep>
    </Wizard>
  );
};

export default ModelDeploymentWizard;
