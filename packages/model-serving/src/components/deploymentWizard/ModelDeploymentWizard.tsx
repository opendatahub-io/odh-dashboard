import React from 'react';
import { PageSection, Wizard, WizardStep } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  ExternalDataLoader,
  isExternalDataReady,
  type ExternalDataMap,
} from './ExternalDataLoader';
import { useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { PreconfigureDeploymentStepContent } from './steps/PreconfigureDeploymentStep';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { ReviewStepContent } from './steps/ReviewStep';
import { ExitDeploymentModal } from './exitModal/ExitDeploymentModal';
import { useRefreshWizardPage } from './useRefreshWizardPage';
import { useExitDeploymentWizard } from './exitModal/useExitDeploymentWizard';
import { DeploymentWizardYAMLView } from './yaml/DeploymentWizardYAMLView';
import { DeploymentWizardViewModeToggle } from './yaml/DeploymentWizardViewModeToggle';
import { useFormYamlResources } from './yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from './yaml/useFormToResourcesTransformer';
import { useModelDeploymentSubmit } from './deploying/useModelDeploymentSubmit';
import { shouldShowPreconfigureStep as calcShouldShowPreconfigureStep } from './utils';
import { InitialWizardFormData, WizardStepTitle } from '../../shared/types/form-data';
import { Deployment } from '../../../extension-points';
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
  const isEdit = !!existingDeployment;
  const onRefresh = useRefreshWizardPage(existingDeployment);
  const { isExitModalOpen, openExitModal, closeExitModal, handleExitConfirm, exitWizardOnSubmit } =
    useExitDeploymentWizard({ returnRoute, cancelReturnRoute, isEdit });

  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;
  const [viewMode, setViewMode] = React.useState<ModelDeploymentWizardViewMode>(
    existingData?.viewMode ?? 'form',
  );

  // External data state - loaded by ExternalDataLoader component
  const [externalData, setExternalData] = React.useState<ExternalDataMap>({});

  const wizardFormData = useModelDeploymentWizard(
    existingData,
    project?.metadata.name,
    externalData,
  );
  const shouldShowPreconfigureStep = calcShouldShowPreconfigureStep(project, existingData);

  const validation = useModelDeploymentWizardValidation(
    wizardFormData.state,
    wizardFormData.fields,
    shouldShowPreconfigureStep,
  );
  const currentProjectName = wizardFormData.state.project.projectName ?? undefined;

  const secretName =
    wizardFormData.state.modelLocationData.data?.connection ??
    wizardFormData.state.createConnectionData.data.nameDesc?.k8sName.value;

  const { resources: formResources } = useFormToResourcesTransformer(
    wizardFormData,
    existingDeployment,
    secretName, // todo remove
  );
  const isAutoFallback = existingData?.viewMode === 'yaml-edit';
  const {
    yaml,
    setYaml,
    resources: finalResources, // will be from yaml or wizard depending view mode
    error: yamlError,
  } = useFormYamlResources(formResources, isAutoFallback ? existingDeployment?.model : undefined);

  const { onSave, onOverwrite, isLoading, submitError, clearSubmitError } =
    useModelDeploymentSubmit(
      wizardFormData.state,
      finalResources,
      validation,
      externalData,
      exitWizardOnSubmit,
      viewMode,
      wizardFormData.initialData,
      existingDeployment,
      secretName,
      yamlError,
    );

  const externalDataReady = isExternalDataReady(externalData);

  const wizardFooter = React.useMemo(
    () => (
      <ModelDeploymentWizardFooter
        error={submitError}
        clearError={clearSubmitError}
        isLoading={isLoading}
        isSubmitDisabled={!externalDataReady}
        submitButtonText={primaryButtonText}
        onOverwrite={onOverwrite}
        onRefresh={onRefresh}
        deploymentName={wizardFormData.state.k8sNameDesc.data.name}
      />
    ),
    [
      submitError,
      clearSubmitError,
      isLoading,
      externalDataReady,
      primaryButtonText,
      onRefresh,
      onOverwrite,
      wizardFormData.state.k8sNameDesc.data.name,
    ],
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
            <DeploymentWizardViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          ) : undefined
        }
      >
        <ExternalDataLoader
          fields={wizardFormData.fields}
          initialData={wizardFormData.initialData}
          formState={wizardFormData.state}
          setExternalData={setExternalData}
          dispatch={wizardFormData.dispatch}
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
                isAutoFallback={isAutoFallback}
              />
            </PageSection>
            <PageSection hasBodyWrapper={false} isFilled={false} style={{ paddingTop: 0 }}>
              <ModelDeploymentFooter
                isSubmitDisabled={
                  !externalDataReady || (viewMode === 'yaml-edit' ? !yaml : !validation.isAllValid)
                }
                onSave={onSave}
                onCancel={openExitModal}
                onOverwrite={onOverwrite}
                onRefresh={onRefresh}
                isLoading={isLoading}
                error={submitError}
                clearError={clearSubmitError}
                deploymentName={wizardFormData.state.k8sNameDesc.data.name}
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
            {shouldShowPreconfigureStep && (
              <WizardStep name={WizardStepTitle.PRECONFIGURE} id="preconfigure-step">
                <PreconfigureDeploymentStepContent wizardState={wizardFormData} />
              </WizardStep>
            )}
            <WizardStep
              name={WizardStepTitle.MODEL_DETAILS}
              id="source-model-step"
              isDisabled={!validation.isPreconfigureStepValid}
            >
              <ModelSourceStepContent
                wizardState={wizardFormData}
                validation={validation.modelSource}
                externalData={externalData}
              />
            </WizardStep>
            <WizardStep
              name={WizardStepTitle.MODEL_DEPLOYMENT}
              id="model-deployment-step"
              isDisabled={!validation.isPreconfigureStepValid || !validation.isModelSourceStepValid}
            >
              <ModelDeploymentStepContent
                projectName={currentProjectName}
                wizardState={wizardFormData}
                externalData={externalData}
                hideProjectSection={shouldShowPreconfigureStep}
              />
            </WizardStep>
            <WizardStep
              name={WizardStepTitle.ADVANCED_SETTINGS}
              id="advanced-options-step"
              isDisabled={
                !validation.isPreconfigureStepValid ||
                !validation.isModelSourceStepValid ||
                !validation.isModelDeploymentStepValid
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
                !validation.isPreconfigureStepValid ||
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
