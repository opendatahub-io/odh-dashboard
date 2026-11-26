import React from 'react';
import { Alert, PageSection, Spinner, Wizard, WizardStep } from '@patternfly/react-core';
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
import { useExitDeploymentWizard } from './exitModal/useExitDeploymentWizard';
import { DeploymentWizardYAMLView } from './yaml/lazyDeploymentWizardYAMLView';
import { DeploymentWizardViewModeToggle } from './yaml/DeploymentWizardViewModeToggle';
import { useFormYamlResources } from './yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from './yaml/useFormToResourcesTransformer';
import type { useYamlViewSession } from './yaml/useYamlViewSession';
import { isYamlDirty } from './yaml/yamlUtils';
import { useModelDeploymentSubmit } from './deploying/useModelDeploymentSubmit';
import { shouldShowPreconfigureStep as calcShouldShowPreconfigureStep } from './utils';
import { InitialWizardFormData, WizardStepTitle } from '../../shared/types/form-data';
import { Deployment } from '../../../extension-points';
import type { DeploymentAssemblyResources } from '../../../extension-points/deployment-wizard';
import {
  ModelDeploymentFooter,
  ModelDeploymentWizardFooter,
} from '../generic/WizardFooterWithDisablingNext';

type DeploymentWizardFormProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  project?: ProjectKind;
  existingDeployment?: Deployment;
  returnRoute?: string;
  cancelReturnRoute?: string;
  /** Seeds every field hook on mount; the parent remounts this component to re-seed */
  initialData?: InitialWizardFormData;
  /** Resources the form is assembled onto, so properties added in YAML are kept */
  latestResourcesFromYamlOrEdit?: DeploymentAssemblyResources;
  yamlSession: ReturnType<typeof useYamlViewSession>;
  /** Called when switching to the form after a real YAML edit; the parent remounts this form */
  onReinitFromYaml: (
    initialDataFromYaml: InitialWizardFormData,
    model: DeploymentAssemblyResources['model'],
  ) => void;
  onRefresh?: () => void;
  /** Owned by the parent so the current step survives view switches and remounts */
  lastStepIndex?: number;
  onStepIndexChange: (index: number) => void;
};

/**
 * The deployment wizard's form and YAML views, with their state and submit. Rendered with a `key`
 * by `ModelDeploymentWizard`, which owns the state that must survive a remount: the view mode and
 * the merge base.
 */
const DeploymentWizardForm: React.FC<DeploymentWizardFormProps> = ({
  title,
  description,
  primaryButtonText,
  project,
  existingDeployment,
  returnRoute,
  cancelReturnRoute,
  initialData,
  latestResourcesFromYamlOrEdit: mergeBase,
  yamlSession,
  onReinitFromYaml,
  onRefresh,
  lastStepIndex,
  onStepIndexChange,
}) => {
  // External data state - loaded by ExternalDataLoader component
  const [externalData, setExternalData] = React.useState<ExternalDataMap>({});

  const wizardFormData = useModelDeploymentWizard(
    initialData,
    project?.metadata.name,
    externalData,
  );
  const { resources: formAsResources, loaded: formResourcesLoaded } = useFormToResourcesTransformer(
    wizardFormData,
    mergeBase,
  );
  const { isExitModalOpen, openExitModal, closeExitModal, handleExitConfirm, exitWizardOnSubmit } =
    useExitDeploymentWizard({
      returnRoute,
      cancelReturnRoute,
      isEdit: !!existingDeployment,
      formData: wizardFormData,
    });

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
  } = yamlSession;
  // Safe to reset on remount: entering YAML always regenerates the editor from the form, so a
  // re-seed from the deployment (auto-fallback) after a remount is never shown
  const {
    yaml,
    yamlAtEntry,
    setYaml,
    reinitYamlFromResources,
    resources: yamlAsResources,
    initialData: initialDataFromYaml,
    yamlSubmitErrors,
    yamlToFormErrors,
  } = useFormYamlResources(isAutoFallback ? existingDeployment : undefined);

  const handleSwitchToForm = (updateFormWithYaml: boolean) => {
    const formDataFromYaml = initialDataFromYaml?.formData;
    // A content check, not a click check: form-only state (e.g. a typed Hugging Face token)
    // must survive a round-trip that didn't change the YAML
    if (
      updateFormWithYaml &&
      viewMode === 'yaml-edit' &&
      formDataFromYaml &&
      isYamlDirty(yaml?.yaml ?? '', yamlAtEntry)
    ) {
      onReinitFromYaml(formDataFromYaml, yamlAsResources.resources.model);
    }
    // Ideally set 'LastUpdated' when a field is updated, but that's only possible for extension based fields using the dispatch to set state
    setLastUpdatedSource('form');
    switchToForm();
  };

  const {
    onSave,
    onOverwrite,
    isLoading,
    isReadinessLoading,
    accessReason,
    submitError,
    clearSubmitError,
  } = useModelDeploymentSubmit(
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
  const isSubmitDisabled = !externalDataReady || isReadinessLoading || !!accessReason;

  const wizardFooter = React.useMemo(
    () => (
      <ModelDeploymentWizardFooter
        error={submitError}
        clearError={clearSubmitError}
        isLoading={isLoading}
        isSubmitDisabled={isSubmitDisabled}
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
      isSubmitDisabled,
      primaryButtonText,
      onRefresh,
      onOverwrite,
      wizardFormData.state.k8sNameDesc.data.name,
    ],
  );

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
              isSwitchToFormLoading={!initialDataFromYaml?.loaded}
              // Fields re-initialize as their data loads (external data, hardware profiles,
              // connections); switching earlier snapshots stale YAML
              isSwitchToYamlLoading={
                !formResourcesLoaded ||
                !externalDataReady ||
                !wizardFormData.loaded.modelSourceLoaded ||
                !wizardFormData.loaded.modelDeploymentLoaded
              }
              // A switch to the form can remount it, which would drop an in-flight submit
              isDisabled={isLoading}
              switchToForm={handleSwitchToForm}
              switchToYaml={() => {
                if (viewMode === 'form') {
                  reinitYamlFromResources(formAsResources);
                }
                switchToYaml(false, canEnterYAMLEditMode);
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
        {accessReason && currentProjectName && (
          <Alert isInline variant="info" title={accessReason} />
        )}
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
                  isSubmitDisabled ||
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
            startIndex={lastStepIndex ?? wizardFormData.initialData?.wizardStartIndex ?? 1}
            onStepChange={(_, currentStep) => onStepIndexChange(currentStep.index)}
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

export default DeploymentWizardForm;
