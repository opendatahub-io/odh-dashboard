import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spinner, Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { getDeploymentWizardExitRoute } from './utils';
import { ModelDeploymentWizardData, useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { useDeployMethod } from './useDeployMethod';
import { useConnectionCreation } from './useConnectionCreation';
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
  const { connectionMethod, connectionMethodLoaded } = useConnectionCreation(wizardState.state);

  const secretName = React.useMemo(() => {
    const name =
      wizardState.state.modelLocationData.data?.connection ??
      wizardState.state.createConnectionData.data.nameDesc?.name ??
      getGeneratedSecretName();

    wizardState.state.createConnectionData.setData({
      ...wizardState.state.createConnectionData.data,
      nameDesc: {
        name,
        description: wizardState.state.createConnectionData.data.nameDesc?.description || '',
        k8sName: {
          value: name,
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
    return name;
  }, [
    wizardState.state.createConnectionData.data.nameDesc?.name,
    wizardState.state.modelLocationData.data?.connection,
  ]);

  const onSave = React.useCallback(() => {
    // Use existing validation to prevent submission with invalid data
    if (
      !validation.isModelSourceStepValid ||
      !validation.isModelDeploymentStepValid ||
      !deployMethodLoaded ||
      !deployMethod ||
      !connectionMethodLoaded
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
      connectionMethod?.properties.handleConnectionCreation(
        wizardState.state.createConnectionData.data,
        project.metadata.name,
        wizardState.state.modelLocationData.data,
        secretName,
        true,
      ),
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
        connectionMethod?.properties.handleConnectionCreation(
          wizardState.state.createConnectionData.data,
          project.metadata.name,
          wizardState.state.modelLocationData.data,
          secretName,
          false,
        ),
        deployMethod.properties.deploy(
          wizardState.state,
          project.metadata.name,
          undefined,
          serverResource,
          serverResourceTemplateName,
          false,
        ),
      ]).then(([, deploymentResult]) => {
        if (!wizardState.state.modelLocationData.data) {
          return;
        }

        Promise.all([
          connectionMethod?.properties.handleSecretOwnerReferencePatch(
            wizardState.state.createConnectionData.data,
            deploymentResult.model,
            wizardState.state.modelLocationData.data,
            secretName,
            deploymentResult.model.metadata.uid ?? '',
            false,
          ),
        ]).then(() => {
          exitWizard();
        });
      });
    });
  }, [
    exitWizard,
    project.metadata.name,
    deployMethodLoaded,
    deployMethod,
    connectionMethodLoaded,
    connectionMethod,
    wizardState.state,
    validation.isModelSourceStepValid,
    validation.isModelDeploymentStepValid,
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
