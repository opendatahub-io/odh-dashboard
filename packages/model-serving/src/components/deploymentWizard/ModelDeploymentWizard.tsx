import React from 'react';
import {
  PageSection,
  ToggleGroup,
  ToggleGroupItem,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getGeneratedSecretName,
  isGeneratedSecretName,
} from '@odh-dashboard/internal/api/k8s/secrets';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import { Deployment } from 'extension-points';
import { deployModel } from './utils';
import { ExternalDataLoader, type ExternalDataMap } from './ExternalDataLoader';
import { useModelDeploymentWizard } from './useDeploymentWizard';
import { useModelDeploymentWizardValidation } from './useDeploymentWizardValidation';
import { ModelSourceStepContent } from './steps/ModelSourceStep';
import { AdvancedSettingsStepContent } from './steps/AdvancedOptionsStep';
import { ModelDeploymentStepContent } from './steps/ModelDeploymentStep';
import { ReviewStepContent } from './steps/ReviewStep';
import { useDeployMethod } from './useDeployMethod';
import { useWizardFieldApply } from './useWizardFieldApply';
import { InitialWizardFormData, WizardStepTitle } from './types';
import { ExitDeploymentModal } from './exitModal/ExitDeploymentModal';
import { useRefreshWizardPage } from './useRefreshWizardPage';
import { useExitDeploymentWizard } from './exitModal/useExitDeploymentWizard';
import { DeploymentWizardYAMLView } from './yaml/DeploymentWizardYAMLView';
import { useFormYamlResources } from './yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from './yaml/useFormToResourcesTransformer';
import {
  ModelDeploymentFooter,
  ModelDeploymentWizardFooter,
} from '../generic/WizardFooterWithDisablingNext';

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

  const [viewMode, setViewMode] = React.useState<'form' | 'yaml-preview' | 'yaml-edit'>('form');
  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;

  // External data state - loaded by ExternalDataLoader component
  const [externalData, setExternalData] = React.useState<ExternalDataMap>({});

  const wizardState = useModelDeploymentWizard(existingData, project?.metadata.name, externalData);
  const validation = useModelDeploymentWizardValidation(wizardState.state, wizardState.fields);
  const currentProjectName = wizardState.state.project.projectName ?? undefined;

  const { deployMethod, deployMethodLoaded } = useDeployMethod(wizardState.state);
  // TODO in same jira, replace deployMethod with applyFieldData for all other fields
  const { applyFieldData, applyExtensionsLoaded } = useWizardFieldApply(wizardState.state);

  const { resources } = useFormToResourcesTransformer(wizardState, existingDeployment);
  const { yaml } = useFormYamlResources(resources);

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
    const shouldSync = !current?.name || isGeneratedSecretName(current.name);

    if (shouldSync && current?.k8sName.value !== secretName) {
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
          !deployMethod ||
          !applyExtensionsLoaded
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
          exitWizardOnSubmit,
          deployMethod.properties.deploy,
          existingDeployment,
          serverResource,
          serverResourceTemplateName,
          overwrite,
          wizardState.initialData,
          applyFieldData,
        );
      } catch (error) {
        setSubmitError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    },
    [
      applyExtensionsLoaded,
      applyFieldData,
      deployMethod,
      deployMethodLoaded,
      existingDeployment,
      exitWizardOnSubmit,
      currentProjectName,
      secretName,
      validation.isModelDeploymentStepValid,
      validation.isModelSourceStepValid,
      wizardState,
    ],
  );

  const wizardFooter = React.useMemo(
    () => (
      <ModelDeploymentWizardFooter
        error={submitError}
        clearError={() => setSubmitError(null)}
        isLoading={isLoading}
        submitButtonText={primaryButtonText}
        onOverwrite={deployMethod?.properties.supportsOverwrite ? () => onSave(true) : undefined}
        onRefresh={onRefresh}
      />
    ),
    [
      submitError,
      isLoading,
      primaryButtonText,
      deployMethod?.properties.supportsOverwrite,
      onSave,
      onRefresh,
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
                isSelected={viewMode === 'yaml-preview' || viewMode === 'yaml-edit'}
                onChange={() => (viewMode === 'form' ? setViewMode('yaml-preview') : undefined)}
              />
            </ToggleGroup>
          ) : undefined
        }
      >
        <ExternalDataLoader
          fields={wizardState.fields}
          initialData={existingData}
          setExternalData={setExternalData}
        />
        {isExitModalOpen && (
          <ExitDeploymentModal onClose={closeExitModal} onConfirm={handleExitConfirm} />
        )}
        {viewMode === 'yaml-edit' || viewMode === 'yaml-preview' ? (
          <>
            <PageSection isFilled hasBodyWrapper={false} style={{ paddingTop: 0 }}>
              <DeploymentWizardYAMLView
                code={yaml}
                setCode={() => undefined}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            </PageSection>
            <PageSection hasBodyWrapper={false} isFilled={false} style={{ paddingTop: 0 }}>
              <ModelDeploymentFooter
                onSave={onSave}
                onCancel={openExitModal}
                onOverwrite={
                  deployMethod?.properties.supportsOverwrite ? () => onSave(true) : undefined
                }
                onRefresh={onRefresh}
                error={submitError}
                clearError={() => setSubmitError(null)}
              />
            </PageSection>
          </>
        ) : (
          <Wizard
            onClose={openExitModal}
            onSave={() => onSave()}
            footer={wizardFooter}
            startIndex={wizardState.initialData?.wizardStartIndex ?? 1}
          >
            <WizardStep name={WizardStepTitle.MODEL_DETAILS} id="source-model-step">
              <ModelSourceStepContent
                wizardState={wizardState}
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
                wizardState={wizardState}
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
                wizardState={wizardState}
                externalData={externalData}
                allowCreate={wizardState.state.canCreateRoleBindings}
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
                wizardState={wizardState}
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
