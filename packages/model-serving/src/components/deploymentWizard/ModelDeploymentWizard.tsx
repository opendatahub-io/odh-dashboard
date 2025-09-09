import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getDeploymentWizardExitRoute } from './utils';
import { useModelDeploymentWizard, type ModelDeploymentWizardData } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { WizardFooterWithDisablingNext } from './WizardFooterWithDisablingNext';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { isModelServingDeploy } from '../../../extension-points';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: ModelDeploymentWizardData;
  project: ProjectKind;
  modelServingPlatform: ModelServingPlatform;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
  modelServingPlatform,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [deployExtension, deployExtensionLoaded] = useResolvedPlatformExtension(
    isModelServingDeploy,
    modelServingPlatform,
  );

  const exitWizard = React.useCallback(() => {
    navigate(getDeploymentWizardExitRoute(location.pathname));
  }, [navigate, location.pathname]);

  const wizardState = useModelDeploymentWizard(existingData);
  const validation = useModelDeploymentWizardValidation(wizardState.state);

  const onSave = React.useCallback(() => {
    // Use existing validation to prevent submission with invalid data
    if (
      !validation.isModelSourceStepValid ||
      !validation.isModelDeploymentStepValid ||
      !deployExtensionLoaded
    ) {
      return;
    }

    Promise.all([
      deployExtension?.properties.deploy(wizardState.state, project.metadata.name, undefined, true),
    ]).then(() => {
      Promise.all([
        deployExtension?.properties.deploy(
          wizardState.state,
          project.metadata.name,
          undefined,
          false,
        ),
      ]).then(() => {
        exitWizard();
      });
    });
  }, [
    exitWizard,
    project.metadata.name,
    deployExtensionLoaded,
    deployExtension,
    wizardState.state,
    validation.isModelSourceStepValid,
    validation.isModelDeploymentStepValid,
  ]);

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <Wizard onClose={exitWizard} onSave={onSave} footer={<WizardFooterWithDisablingNext />}>
        <WizardStep name="Source model" id="source-model-step">
          <ModelSourceStepContent wizardState={wizardState} validation={validation.modelSource} />
        </WizardStep>
        <WizardStep
          name="Model deployment"
          id="model-deployment-step"
          isDisabled={!validation.isModelSourceStepValid}
        >
          <ModelDeploymentStepContent
            projectName={project.metadata.name}
            wizardState={wizardState}
          />
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
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
