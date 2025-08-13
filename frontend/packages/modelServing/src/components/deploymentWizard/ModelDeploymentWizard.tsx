import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

type ModelDeploymentWizardProps = {
  title: string;
  description: string;
  primaryButtonText: string;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
}) => {
  const navigate = useNavigate();
  const url = useLocation().pathname;

  const exitWizard = () => {
    const baseUrl = url.substring(0, url.lastIndexOf('deploy'));
    navigate(baseUrl);
  };

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <Wizard title="Basic wizard" onClose={exitWizard} onSave={exitWizard}>
        <WizardStep name="Step 1" id="basic-first-step">
          Step 1 content
        </WizardStep>
        <WizardStep name="Step 2" id="basic-second-step">
          Step 2 content
        </WizardStep>
        <WizardStep name="Step 3" id="basic-third-step">
          Step 3 content
        </WizardStep>
        <WizardStep
          name="Review"
          id="basic-review-step"
          footer={{ nextButtonText: primaryButtonText }}
        >
          Review step content
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
