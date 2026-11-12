import React from 'react';
import { PageSection, Spinner, Wizard, WizardStep } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
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
import { DeploymentWizardYAMLView } from './yaml/lazyDeploymentWizardYAMLView';
import { DeploymentWizardViewModeToggle } from './yaml/DeploymentWizardViewModeToggle';
import { useFormYamlResources } from './yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from './yaml/useFormToResourcesTransformer';
import { useModelDeploymentSubmit } from './deploying/useModelDeploymentSubmit';
import { shouldShowPreconfigureStep as calcShouldShowPreconfigureStep } from './utils';
import { useYamlViewSession } from './yaml/useYamlViewSession';
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
  initialFormDataFromNav?: InitialWizardFormData;
  project?: ProjectKind;
  existingDeployment?: Deployment;
  returnRoute?: string;
  cancelReturnRoute?: string;
};
/**
 * Core data objects are:
 * - `initialData`: Used to initialize the wizard form. Comes from navigation or from interpreting the yaml
 * - `wizardFormData`: The current state of the UI fields in the form.
 * - `...Resources` (from form or YAML): Final representation of a deployment, what is submitted to kubernetes. Used to parse between form and YAML views too.
 */
const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  title,
  description,
  primaryButtonText,
  initialFormDataFromNav,
  project,
  existingDeployment,
  returnRoute,
  cancelReturnRoute,
}) => {
  const onRefresh = useRefreshWizardPage(existingDeployment);
  const { isExitModalOpen, openExitModal, closeExitModal, handleExitConfirm, exitWizardOnSubmit } =
    useExitDeploymentWizard({ returnRoute, cancelReturnRoute, isEdit: !!existingDeployment });

  // External data state - loaded by ExternalDataLoader component
  const [externalData, setExternalData] = React.useState<ExternalDataMap>({});

  const wizardFormData = useModelDeploymentWizard(
    initialFormDataFromNav,
    project?.metadata.name,
    externalData,
  );
  const { resources: formAsResources, setLatestResourcesFromYaml } = useFormToResourcesTransformer(
    wizardFormData,
    existingDeployment,
  );

  const shouldShowPreconfigureStep = calcShouldShowPreconfigureStep(
    project,
    wizardFormData.initialData,
  );

  const validation = useModelDeploymentWizardValidation(
    wizardFormData.state,
    wizardFormData.fields,
    shouldShowPreconfigureStep,
  );
  const currentProjectName = wizardFormData.state.project.projectName ?? undefined;

  // temp hack to limit yaml editor to LLMd only
  const canEnterYAMLEditMode =
    existingDeployment?.model.kind !== 'InferenceService' &&
    wizardFormData.state.modelServer?.data?.selection?.template?.kind !== 'Template';
  const {
    isYAMLViewerEnabled,
    isAutoFallback,
    viewMode,
    switchToForm,
    switchToYaml,
    lastUpdatedSource,
    setLastUpdatedSource,
  } = useYamlViewSession(initialFormDataFromNav?.viewMode ?? 'form', canEnterYAMLEditMode);

  const {
    yaml,
    setYaml,
    reinitYamlFromResources,
    resources: yamlAsResources,
    initialData: initialDataFromYaml,
    yamlSubmitErrors,
    yamlToFormErrors,
  } = useFormYamlResources(isAutoFallback ? existingDeployment : undefined);

  const { onSave, onOverwrite, isLoading, isReadinessLoading, submitError, clearSubmitError } =
    useModelDeploymentSubmit(
      wizardFormData.state,
      wizardFormData.deployMethodActivationInput,
      lastUpdatedSource === 'form' ? formAsResources : yamlAsResources.resources,
      validation,
      externalData,
      exitWizardOnSubmit,
      viewMode,
      wizardFormData.initialData,
      existingDeployment,
      yamlSubmitErrors,
    );

  const externalDataReady = isExternalDataReady(externalData);

  const wizardFooter = React.useMemo(
    () => (
      <ModelDeploymentWizardFooter
        error={submitError}
        clearError={clearSubmitError}
        isLoading={isLoading}
        isSubmitDisabled={!externalDataReady || isReadinessLoading}
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
      isReadinessLoading,
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
            <DeploymentWizardViewModeToggle
              isYamlEmpty={!yaml?.yaml}
              viewMode={viewMode}
              yamlErrors={yamlToFormErrors}
              canUpdateFormFromYaml={!!initialDataFromYaml?.formData}
              switchToForm={(updateFormWithYaml = true) => {
                if (
                  updateFormWithYaml &&
                  viewMode === 'yaml-edit' &&
                  initialDataFromYaml?.formData
                ) {
                  setLatestResourcesFromYaml(yamlAsResources.resources);
                  wizardFormData.dispatch({
                    type: 'reInitForm',
                    payload: { initialData: initialDataFromYaml.formData },
                  });
                }
                // Ideally set 'LastUpdated' when a field is updated, but that's only possible for extension based fields using the dispatch to set state
                setLastUpdatedSource('form');
                switchToForm();
              }}
              switchToYaml={() => {
                if (viewMode === 'form') {
                  reinitYamlFromResources(formAsResources);
                }
                switchToYaml();
              }}
            />
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
        {isYAMLViewerEnabled && viewMode !== 'form' ? (
          <>
            <PageSection isFilled hasBodyWrapper={false} style={{ paddingTop: 0, marginBottom: 0 }}>
              <React.Suspense fallback={<Spinner />}>
                <DeploymentWizardYAMLView
                  code={yaml}
                  setCode={setYaml}
                  viewMode={viewMode}
                  switchToYamlEdit={() => switchToYaml(true)}
                  canEnterYAMLEditMode={canEnterYAMLEditMode}
                  isAutoFallback={isAutoFallback}
                  setLastUpdatedSource={setLastUpdatedSource}
                />
              </React.Suspense>
            </PageSection>
            <PageSection hasBodyWrapper={false} isFilled={false} style={{ paddingTop: 0 }}>
              <ModelDeploymentFooter
                isSubmitDisabled={
                  !externalDataReady ||
                  isReadinessLoading ||
                  (viewMode === 'yaml-edit' ? !yaml?.yaml : !validation.isAllValid)
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
