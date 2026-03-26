import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { useDeployMethod } from './useDeployMethod';
import { ModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import { useWizardFieldApply } from '../useWizardFieldApply';
import { deployModel } from '../utils';
import { Deployment, DeploymentAssemblyResources } from '../../../../extension-points';
import { InitialWizardFormData } from '../types';
import { WizardFormState } from '../useDeploymentWizardReducer';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

/**
 * Get the onSubmit function to create / update the deployment. 
 
 * @returns The onSubmit function to create / update the deployment
 */
export const useModelDeploymentSubmit = (
  formState: WizardFormState, // Need initial data for existing auth secrets
  resources: DeploymentAssemblyResources<Deployment>,
  validation: ModelDeploymentWizardValidation,
  exitWizardOnSubmit: () => void,
  viewMode: ModelDeploymentWizardViewMode = 'form',
  initialWizardData?: InitialWizardFormData,
  existingDeployment?: Deployment,
  connectionSecretName?: string, // We really need to remove this, kept for backwards compatibility
  yamlError?: Error,
): {
  onSave: (overwrite?: boolean) => Promise<void>;
  onOverwrite?: () => Promise<void>;
  isLoading: boolean;
  submitError: Error | null;
  clearSubmitError: () => void;
} => {
  const { deployMethod, deployMethodLoaded } = useDeployMethod(formState, resources);
  const { applyFieldData, applyExtensionsLoaded } = useWizardFieldApply(
    formState,
    initialWizardData?.navSourceMetadata,
  );

  const [submitError, setSubmitError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSave = React.useCallback(
    async (overwrite?: boolean) => {
      setSubmitError(null);
      setIsLoading(true);

      try {
        if (viewMode === 'form' && !validation.isAllValid) {
          throw new Error('Invalid form data');
        }
        if (viewMode === 'yaml-edit' && yamlError) {
          throw yamlError;
        }
        if (
          viewMode === 'yaml-edit' &&
          (resources.model?.kind !== 'LLMInferenceService' ||
            resources.model.apiVersion !== 'serving.kserve.io/v1alpha1')
        ) {
          throw new Error(
            'Invalid YAML: Kind must be LLMInferenceService and apiVersion must be serving.kserve.io/v1alpha1',
          );
        }
        if (!deployMethodLoaded || !deployMethod || !applyExtensionsLoaded) {
          throw new Error(
            'Deploy method or extensions not loaded or could not be inferred from resources',
          );
        }

        const serverResourceTemplateName = formState.modelServer.data?.selection?.name;
        const allModelServerTemplates = formState.modelFormatState.templatesFilteredForModelType;
        const serverResource = serverResourceTemplateName
          ? getServingRuntimeFromTemplate(
              allModelServerTemplates?.find(
                (template) => template.metadata.name === serverResourceTemplateName,
              ),
            )
          : undefined;

        await deployModel(
          formState,
          connectionSecretName,
          deployMethod.properties,
          existingDeployment,
          resources.model,
          resources.server ?? serverResource,
          serverResourceTemplateName,
          overwrite,
          initialWizardData,
          applyFieldData,
        );
        exitWizardOnSubmit();
      } catch (error) {
        setSubmitError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    },
    [
      viewMode,
      validation.isAllValid,
      deployMethodLoaded,
      deployMethod,
      applyExtensionsLoaded,
      formState,
      resources,
      connectionSecretName,
      existingDeployment,
      initialWizardData,
      applyFieldData,
      exitWizardOnSubmit,
      yamlError,
    ],
  );

  return React.useMemo(
    () => ({
      onSave,
      onOverwrite: deployMethod?.properties.supportsOverwrite ? () => onSave(true) : undefined,
      isLoading,
      submitError,
      clearSubmitError: () => setSubmitError(null),
    }),
    [onSave, deployMethod?.properties.supportsOverwrite, isLoading, submitError],
  );
};
