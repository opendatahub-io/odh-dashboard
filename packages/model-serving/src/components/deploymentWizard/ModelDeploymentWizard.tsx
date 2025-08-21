import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getDeploymentWizardExitRoute } from './utils';

import {
  useModelDeploymentWizard,
  type UseModelDeploymentWizardProps,
} from './useDeploymentWizard';
import { ModelSourceStepContent } from './steps/ModelSourceStep';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: UseModelDeploymentWizardProps;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const exitWizard = React.useCallback(() => {
    navigate(getDeploymentWizardExitRoute(location.pathname));
  }, [navigate, location.pathname]);

  const modelDeploymentWizardData = useModelDeploymentWizard(existingData);

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <Wizard onClose={exitWizard} onSave={exitWizard}>
        <WizardStep name="Source model" id="source-model-step">
          <ModelSourceStepContent wizardData={modelDeploymentWizardData} />
        </WizardStep>
        <WizardStep name="Model deployment" id="model-deployment-step">
          Step 2 content
        </WizardStep>
        <WizardStep name="Advanced options" id="advanced-options-step">
          Step 3 content
        </WizardStep>
        <WizardStep name="Summary" id="summary-step" footer={{ nextButtonText: primaryButtonText }}>
          Review step content
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
