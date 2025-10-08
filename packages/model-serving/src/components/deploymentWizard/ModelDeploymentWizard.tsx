import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spinner, Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { Deployment } from 'extension-points';
import { getDeploymentWizardExitRoute } from './utils';
import { ModelDeploymentWizardData, useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { useDeployMethod } from './useDeployMethod';
import {
  handleConnectionCreation,
  handleSecretOwnerReferencePatch,
} from '../../concepts/connectionUtils';
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
  }, [secretName]);

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
      handleConnectionCreation(
        wizardState.state.createConnectionData.data,
        project.metadata.name,
        wizardState.state.modelLocationData.data,
        secretName,
        true,
        wizardState.state.modelLocationData.selectedConnection,
      ),
      deployMethod.properties.deploy(
        wizardState.state,
        project.metadata.name,
        existingDeployment,
        serverResource,
        serverResourceTemplateName,
        true,
      ),
    ]).then(([dryRunSecret]) => {
      // We calculate the secret name being used in handleConnectionCreation and ensure the same name is used in the deploy and secret creation calls
      const realSecretName = dryRunSecret?.metadata.name ?? secretName;

      return handleConnectionCreation(
        wizardState.state.createConnectionData.data,
        project.metadata.name,
        wizardState.state.modelLocationData.data,
        realSecretName,
        false,
        wizardState.state.modelLocationData.selectedConnection,
      ).then((newSecret) => {
        // This just takes the name from the secret that was created and uses realSecretName as a fallback but they should be the same
        const actualSecretName = newSecret?.metadata.name ?? realSecretName;
        Promise.all([
          deployMethod.properties.deploy(
            wizardState.state,
            project.metadata.name,
            existingDeployment,
            serverResource,
            serverResourceTemplateName,
            false,
            actualSecretName,
          ),
        ]).then(([deploymentResult]) => {
          if (!wizardState.state.modelLocationData.data) {
            return;
          }

          return handleSecretOwnerReferencePatch(
            wizardState.state.createConnectionData.data,
            deploymentResult.model,
            wizardState.state.modelLocationData.data,
            actualSecretName,
            deploymentResult.model.metadata.uid ?? '',
            false,
          )
            .then(() => {
              exitWizard();
            })
            .catch((error) => {
              console.error('Deployment or patching failed,', error);
              exitWizard();
            });
        });
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
