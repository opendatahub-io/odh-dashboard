import React from 'react';
import {
  PageSection,
  ToggleGroup,
  ToggleGroupItem,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getGeneratedSecretName,
  isGeneratedSecretName,
} from '@odh-dashboard/internal/api/k8s/secrets';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import { Deployment } from 'extension-points';
import { ExternalDataLoader, type ExternalDataMap } from './ExternalDataLoader';
import { useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { ReviewStepContent } from './steps/ReviewStep';
import { InitialWizardFormData, WizardStepTitle } from './types';
import { ExitDeploymentModal } from './exitModal/ExitDeploymentModal';
import { useRefreshWizardPage } from './useRefreshWizardPage';
import { useExitDeploymentWizard } from './exitModal/useExitDeploymentWizard';
import { DeploymentWizardYAMLView } from './yaml/DeploymentWizardYAMLView';
import { useFormYamlResources } from './yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from './yaml/useFormToResourcesTransformer';
import { useModelDeploymentSubmit } from './deploying/useModelDeploymentSubmit';
import {
  ModelDeploymentFooter,
  ModelDeploymentWizardFooter,
} from '../generic/WizardFooterWithDisablingNext';

export type ModelDeploymentWizardViewMode = 'form' | 'yaml-preview' | 'yaml-edit';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  existingData?: InitialWizardFormData;
  project?: ProjectKind;
  existingDeployment?: Deployment;
  returnRoute?: string;
  cancelReturnRoute?: string;
};

const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  existingData,
  project,
  existingDeployment,
  returnRoute,
  cancelReturnRoute,
}) => {
  const onRefresh = useRefreshWizardPage(existingDeployment);
  const { isExitModalOpen, openExitModal, closeExitModal, handleExitConfirm, exitWizardOnSubmit } =
    useExitDeploymentWizard({ returnRoute, cancelReturnRoute });

  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;
  const [viewMode, setViewMode] = React.useState<ModelDeploymentWizardViewMode>('form');

  // External data state - loaded by ExternalDataLoader component
  const [externalData, setExternalData] = React.useState<ExternalDataMap>({});

  const wizardFormData = useModelDeploymentWizard(
    existingData,
    project?.metadata.name,
    externalData,
  );
  const validation = useModelDeploymentWizardValidation(
    wizardFormData.state,
    wizardFormData.fields,
  );
  const currentProjectName = wizardFormData.state.project.projectName ?? undefined;

  const { resources: formResources } = useFormToResourcesTransformer(
    wizardFormData,
    existingDeployment,
  );
  const {
    yaml,
    setYaml,
    resources: finalResources, // will be from yaml or wizard depending view mode
  } = useFormYamlResources(formResources);

  const secretName =
    wizardFormData.state.modelLocationData.data?.connection ??
    wizardFormData.state.createConnectionData.data.nameDesc?.k8sName.value ??
    getGeneratedSecretName();
  React.useEffect(() => {
    const current = wizardFormData.state.createConnectionData.data.nameDesc;
    const shouldSync = !current?.name || isGeneratedSecretName(current.name);

    if (shouldSync && current?.k8sName.value !== secretName) {
      wizardFormData.state.createConnectionData.setData({
        ...wizardFormData.state.createConnectionData.data,
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
  }, [secretName, wizardFormData.state.createConnectionData]);

  const { onSave, onOverwrite, isLoading, submitError, clearSubmitError } =
    useModelDeploymentSubmit(
      wizardFormData.state,
      finalResources,
      validation,
      exitWizardOnSubmit,
      viewMode,
      wizardFormData.initialData,
      existingDeployment,
      secretName,
    );

  const wizardFooter = React.useMemo(
    () => (
      <ModelDeploymentWizardFooter
        error={submitError}
        clearError={clearSubmitError}
        isLoading={isLoading}
        submitButtonText={primaryButtonText}
        onOverwrite={onOverwrite}
        onRefresh={onRefresh}
      />
    ),
    [submitError, clearSubmitError, isLoading, primaryButtonText, onRefresh, onOverwrite],
  );

  // preserve the last step index when switching between yaml view
  const lastStepIndex = React.useRef<number>();

  return (
    <>
      <style>
        {`
          body {
            overflow: hidden !important;
          }
        `}
      </style>
      <ApplicationsPage
        title={title}
        description={description}
        loaded
        empty={false}
        headerAction={
          isYAMLViewerEnabled ? (
            <ToggleGroup aria-label="Deployment view mode">
              <ToggleGroupItem
                data-testid="form-view"
                text="Form"
                buttonId="form-view"
                isSelected={viewMode === 'form'}
                onChange={() => setViewMode('form')}
                isDisabled={viewMode === 'yaml-edit'}
              />
              <ToggleGroupItem
                data-testid="yaml-view"
                text="YAML"
                buttonId="yaml-view"
                isSelected={viewMode !== 'form'}
                onChange={() => (viewMode === 'form' ? setViewMode('yaml-preview') : undefined)}
              />
            </ToggleGroup>
          ) : undefined
        }
      >
        <ExternalDataLoader
          fields={wizardFormData.fields}
          initialData={existingData}
          setExternalData={setExternalData}
        />
        {isExitModalOpen && (
          <ExitDeploymentModal onClose={closeExitModal} onConfirm={handleExitConfirm} />
        )}
        {viewMode !== 'form' ? (
          <>
            <PageSection isFilled hasBodyWrapper={false} style={{ paddingTop: 0, marginBottom: 0 }}>
              <DeploymentWizardYAMLView
                code={yaml}
                setCode={setYaml}
                viewMode={viewMode}
                setViewMode={setViewMode}
                canEnterYAMLEditMode={existingDeployment?.model.kind !== 'InferenceService'}
              />
            </PageSection>
            <PageSection hasBodyWrapper={false} isFilled={false} style={{ paddingTop: 0 }}>
              <ModelDeploymentFooter
                isSubmitDisabled={viewMode === 'yaml-edit' ? !yaml : !validation.isAllValid}
                onSave={onSave}
                onCancel={openExitModal}
                onOverwrite={onOverwrite}
                onRefresh={onRefresh}
                isLoading={isLoading}
                error={submitError}
                clearError={clearSubmitError}
              />
            </PageSection>
          </>
        ) : (
          <Wizard
            onClose={openExitModal}
            onSave={() => onSave()}
            footer={wizardFooter}
            startIndex={lastStepIndex.current ?? wizardFormData.initialData?.wizardStartIndex ?? 1}
            onStepChange={(_, currentStep) => {
              lastStepIndex.current = currentStep.index;
            }}
          >
            <WizardStep name={WizardStepTitle.MODEL_DETAILS} id="source-model-step">
              <ModelSourceStepContent
                wizardState={wizardFormData}
                validation={validation.modelSource}
              />
            </WizardStep>
            <WizardStep
              name={WizardStepTitle.MODEL_DEPLOYMENT}
              id="model-deployment-step"
              isDisabled={!validation.isModelSourceStepValid}
            >
              <ModelDeploymentStepContent
                projectName={currentProjectName}
                wizardState={wizardFormData}
              />
            </WizardStep>
            <WizardStep
              name={WizardStepTitle.ADVANCED_SETTINGS}
              id="advanced-options-step"
              isDisabled={
                !validation.isModelSourceStepValid || !validation.isModelDeploymentStepValid
              }
            >
              <AdvancedSettingsStepContent
                wizardState={wizardFormData}
                externalData={externalData}
                allowCreate={wizardFormData.state.canCreateRoleBindings}
              />
            </WizardStep>
            <WizardStep
              name={WizardStepTitle.REVIEW}
              id="summary-step"
              isDisabled={
                !validation.isModelSourceStepValid ||
                !validation.isModelDeploymentStepValid ||
                !validation.isAdvancedSettingsStepValid
              }
            >
              <ReviewStepContent
                wizardState={wizardFormData}
                projectName={currentProjectName}
                externalData={externalData}
              />
            </WizardStep>
          </Wizard>
        )}
      </ApplicationsPage>
    </>
  );
};

export default ModelDeploymentWizard;
