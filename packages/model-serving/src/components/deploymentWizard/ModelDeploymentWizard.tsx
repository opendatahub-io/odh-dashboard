import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Wizard, WizardStep } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { Deployment } from 'extension-points';
import { deployModel } from './utils';
import { useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { ReviewStepContent } from './steps/ReviewStep';
import { useDeployMethod } from './useDeployMethod';
import type { InitialWizardFormData } from './types';
import { ExitDeploymentModal } from './CancelDeploymentModal';
import { WizardFooterWithDisablingNext } from '../generic/WizardFooterWithDisablingNext';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: InitialWizardFormData;
  project?: ProjectKind;
  existingDeployment?: Deployment;
  returnRoute?: string;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
  existingDeployment,
  returnRoute,
}) => {
  const navigate = useNavigate();

  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false);

  const exitWizard = React.useCallback(() => {
    navigate(returnRoute ?? '/ai-hub/deployments');
  }, [navigate, returnRoute]);

  const handleExitConfirm = React.useCallback(() => {
    setIsExitModalOpen(false);
    exitWizard();
  }, [exitWizard]);

  const wizardState = useModelDeploymentWizard(existingData, project?.metadata.name);
  const validation = useModelDeploymentWizardValidation(wizardState.state);
  const currentProjectName = wizardState.state.project.projectName ?? undefined;

  const { deployMethod, deployMethodLoaded } = useDeployMethod(wizardState.state);

  const secretName = React.useMemo(() => {
    return (
      wizardState.state.modelLocationData.data?.connection ??
      wizardState.state.createConnectionData.data.nameDesc?.k8sName.value ??
      getGeneratedSecretName()
    );
  }, [
    wizardState.state.modelLocationData.data?.connection,
    wizardState.state.createConnectionData.data.nameDesc?.k8sName.value,
  ]);

  React.useEffect(() => {
    const current = wizardState.state.createConnectionData.data.nameDesc;
    if (current?.k8sName.value !== secretName) {
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

  const [submitError, setSubmitError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSave = React.useCallback(
    async (overwrite?: boolean) => {
      setSubmitError(null);
      setIsLoading(true);

      try {
        if (
          !validation.isModelSourceStepValid ||
          !validation.isModelDeploymentStepValid ||
          !deployMethodLoaded ||
          !deployMethod
        ) {
          // shouldn't happen, but just in case
          throw new Error('Invalid form data');
        }
        if (!currentProjectName) {
          throw new Error('Select a project before deploying.');
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

        await deployModel(
          wizardState,
          secretName,
          exitWizard,
          deployMethod.properties.deploy,
          existingDeployment,
          serverResource,
          serverResourceTemplateName,
          overwrite,
          wizardState.initialData,
        );
      } catch (error) {
        setSubmitError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    },
    [
      deployMethod,
      deployMethodLoaded,
      existingDeployment,
      exitWizard,
      currentProjectName,
      secretName,
      validation.isModelDeploymentStepValid,
      validation.isModelSourceStepValid,
      wizardState.state,
    ],
  );

  const wizardFooter = React.useMemo(
    () => (
      <WizardFooterWithDisablingNext
        error={submitError}
        clearError={() => setSubmitError(null)}
        isLoading={isLoading}
        submitButtonText={primaryButtonText}
        overwriteSupported={deployMethod?.properties.supportsOverwrite}
        onSave={onSave}
      />
    ),
    [submitError, isLoading, primaryButtonText, deployMethod?.properties.supportsOverwrite, onSave],
  );

  return (
    <ApplicationsPage title={title} description={description} loaded empty={false}>
      {isExitModalOpen && (
        <ExitDeploymentModal
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleExitConfirm}
        />
      )}
      <Wizard
        onClose={() => setIsExitModalOpen(true)}
        onSave={() => onSave()}
        footer={wizardFooter}
      >
        <WizardStep name="Model details" id="source-model-step">
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
              projectName={currentProjectName}
              wizardState={wizardState}
            />
          ) : (
            <Spinner />
          )}
        </WizardStep>
        <WizardStep
          name="Advanced settings"
          id="advanced-options-step"
          isDisabled={!validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid}
        >
          {wizardState.loaded.advancedOptionsLoaded ? (
            <AdvancedSettingsStepContent
              wizardState={wizardState}
              projectName={currentProjectName}
            />
          ) : (
            <Spinner />
          )}
        </WizardStep>
        <WizardStep
          name="Review"
          id="summary-step"
          isDisabled={
            !validation.isModelSourceStepValid ||
            !validation.isModelDeploymentStepValid ||
            !validation.isAdvancedSettingsStepValid
          }
        >
          {wizardState.loaded.summaryLoaded ? (
            <ReviewStepContent wizardState={wizardState} projectName={currentProjectName} />
          ) : (
            <Spinner />
          )}
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

export default ModelDeploymentWizard;
