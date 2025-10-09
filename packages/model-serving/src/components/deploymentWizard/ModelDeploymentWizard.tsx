import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spinner, Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { Deployment } from 'extension-points';
import { getDeploymentWizardExitRoute, DeployModel } from './utils';
import { ModelDeploymentWizardData, useModelDeploymentWizard } from './useDeploymentWizard';
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
  existingDeployment?: Deployment;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
  existingDeployment,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const exitWizard = React.useCallback(() => {
    navigate(getDeploymentWizardExitRoute(location.pathname));
  }, [navigate, location.pathname]);

  const wizardState = useModelDeploymentWizard(existingData);
  const validation = useModelDeploymentWizardValidation(wizardState.state);

  const { deployMethod, deployMethodLoaded } = useDeployMethod(wizardState.state);

  const secretName = React.useMemo(() => {
    return (
      wizardState.state.modelLocationData.data?.connection ??
      wizardState.state.createConnectionData.data.nameDesc?.name ??
      getGeneratedSecretName()
    );
  }, [
    wizardState.state.modelLocationData.data?.connection,
    wizardState.state.createConnectionData.data.nameDesc?.name,
  ]);

  React.useEffect(() => {
    const current = wizardState.state.createConnectionData.data.nameDesc;
    if (current?.name !== secretName) {
      wizardState.state.createConnectionData.setData({
        ...wizardState.state.createConnectionData.data,
        nameDesc: {
          name: secretName,
          description: current?.description || '',
          k8sName: {
            value: secretName,
            state: {
              immutable: false,
              invalidCharacters: false,
              invalidLength: false,
              maxLength: 0,
              touched: false,
            },
          },
        },
      });
    }
  }, [secretName, wizardState.state.createConnectionData]);

  const onSave = React.useCallback(async () => {
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

    DeployModel(
      wizardState,
      project,
      secretName,
      exitWizard,
      deployMethod.properties.deploy,
      existingDeployment,
      serverResource,
      serverResourceTemplateName,
    );
  }, [
    deployMethod,
    deployMethodLoaded,
    existingDeployment,
    exitWizard,
    project.metadata.name,
    secretName,
    validation.isModelDeploymentStepValid,
    validation.isModelSourceStepValid,
    wizardState.state,
  ]);

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      <Wizard onClose={exitWizard} onSave={onSave} footer={<WizardFooterWithDisablingNext />}>
        <WizardStep name="Source model" id="source-model-step">
          {wizardState.loaded.modelSourceLoaded ? (
            <ModelSourceStepContent wizardState={wizardState} validation={validation.modelSource} />
          ) : (
            <Spinner />
          )}
        </WizardStep>
        <WizardStep
          name="Model deployment"
          id="model-deployment-step"
          isDisabled={!validation.isModelSourceStepValid}
        >
          {wizardState.loaded.modelDeploymentLoaded ? (
            <ModelDeploymentStepContent
              projectName={project.metadata.name}
              wizardState={wizardState}
            />
          ) : (
            <Spinner />
          )}
        </WizardStep>
        <WizardStep
          name="Advanced settings (optional)"
          id="advanced-options-step"
          isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
        >
          {wizardState.loaded.advancedOptionsLoaded ? (
            <AdvancedSettingsStepContent wizardState={wizardState} project={project} />
          ) : (
            <Spinner />
          )}
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
          {wizardState.loaded.summaryLoaded ? 'Review step content' : <Spinner />}
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
