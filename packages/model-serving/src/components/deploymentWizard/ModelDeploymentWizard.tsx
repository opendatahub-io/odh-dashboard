import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { getDeploymentWizardExitRoute } from './utils';
import { useModelDeploymentWizard, type ModelDeploymentWizardData } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { useDeployMethod } from './useDeployMethod';
import { WizardFooterWithDisablingNext } from '../generic/WizardFooterWithDisablingNext';

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

  const wizardState = useModelDeploymentWizard(existingData);
  const validation = useModelDeploymentWizardValidation(wizardState.state);

  const { deployMethod, deployMethodLoaded } = useDeployMethod(wizardState.state);

  const onSave = React.useCallback(() => {
    // Use existing validation to prevent submission with invalid data
    if (
      !validation.isModelSourceStepValid ||
      !validation.isModelDeploymentStepValid ||
      !deployMethodLoaded ||
      !deployMethod
    ) {
      return;
    }

    const serverResourceTemplateName = wizardState.state.modelServer.data?.name;
    const allModelServerTemplates =
      wizardState.state.modelFormatState.templatesFilteredForModelType;
    const serverResource = serverResourceTemplateName
      ? getServingRuntimeFromTemplate(
          allModelServerTemplates?.find(
            (template) => template.metadata.name === serverResourceTemplateName,
          ),
        )
      : undefined;

    Promise.all([
      deployMethod.properties.deploy(
        wizardState.state,
        project.metadata.name,
        undefined,
        serverResource,
        serverResourceTemplateName,
        true,
      ),
    ]).then(() => {
      Promise.all([
        deployMethod.properties.deploy(
          wizardState.state,
          project.metadata.name,
          undefined,
          serverResource,
          serverResourceTemplateName,
          false,
        ),
      ]).then(() => {
        exitWizard();
      });
    });
  }, [
    exitWizard,
    project.metadata.name,
    deployMethodLoaded,
    deployMethod,
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
          name="Advanced settings (optional)"
          id="advanced-options-step"
          isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
        >
          <AdvancedSettingsStepContent wizardState={wizardState} project={project} />
        </WizardStep>
        <WizardStep
          name="Summary"
          id="summary-step"
          footer={{ nextButtonText: primaryButtonText }}
          isDisabled={
            !validation.isModelSourceStepValid ||
            !validation.isModelDeploymentStepValid ||
            !validation.isAdvancedSettingsStepValid
          }
        >
          Review step content
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
