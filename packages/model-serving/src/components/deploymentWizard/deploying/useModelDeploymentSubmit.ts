import React from 'react';
import { useSecretOps } from '@odh-dashboard/plugin-core/host-api';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/model-serving/shared';
import { useDeployMethod } from './useDeployMethod';
import { useWizardFieldPreDeploy } from './useWizardFieldPreDeploy';
import { useWizardFieldPostDeploy } from './useWizardFieldPostDeploy';
import { ModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import { useWizardFieldApply } from '../useWizardFieldApply';
import { deployModel } from '../utils';
import { Deployment } from '../../../../extension-points';
import { DeploymentAssemblyResources } from '../../../../extension-points/deployment-wizard';
import { InitialWizardFormData } from '../../../shared/types/form-data';
import { WizardFormState } from '../useDeploymentWizardReducer';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';
import { ExternalDataMap, isExternalDataReady } from '../ExternalDataLoader';
import { useModelDeployedTracking } from '../../../shared/tracking/useModelDeployedTracking';

/**
 * Get the onSubmit function to create / update the deployment. 
 
 * @returns The onSubmit function to create / update the deployment
 */
export const useModelDeploymentSubmit = (
  formState: WizardFormState, // Need initial data for existing auth secrets
  resources: DeploymentAssemblyResources<Deployment>,
  validation: ModelDeploymentWizardValidation,
  externalData: ExternalDataMap,
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
  const secretOps = useSecretOps();
  const { deployMethod, deployMethodLoaded } = useDeployMethod(formState, resources);
  const { fireModelDeployedTracking } = useModelDeployedTracking(
    formState,
    initialWizardData,
    deployMethod?.properties.platform,
  );
  const { applyAllFieldDataFn, applyExtensionsLoaded } = useWizardFieldApply(
    formState,
    initialWizardData?.navSourceMetadata,
  );
  const { runPreDeploy, preDeployExtensionsLoaded } = useWizardFieldPreDeploy(formState);
  const { runPostDeploy, postDeployExtensionsLoaded } = useWizardFieldPostDeploy(formState);

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
        // Fields derive their data from these hooks -- deploying before they settle drops that data
        if (!isExternalDataReady(externalData)) {
          throw new Error('Required data is still loading');
        }
        if (viewMode === 'yaml-edit' && yamlError) {
          throw yamlError;
        }
        if (
          viewMode === 'yaml-edit' &&
          (resources.model?.kind !== 'LLMInferenceService' ||
            resources.model.apiVersion !== 'serving.kserve.io/v1alpha2')
        ) {
          throw new Error(
            'Invalid YAML: Kind must be LLMInferenceService and apiVersion must be serving.kserve.io/v1alpha2',
          );
        }
        if (
          !deployMethodLoaded ||
          !deployMethod ||
          !applyExtensionsLoaded ||
          !preDeployExtensionsLoaded ||
          !postDeployExtensionsLoaded
        ) {
          throw new Error(
            'Deploy method or extensions not loaded or could not be inferred from resources',
          );
        }

        const serverResourceTemplateName = formState.modelServer?.data?.selection?.name;
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
          externalData,
          secretOps,
          connectionSecretName,
          deployMethod.properties,
          existingDeployment,
          resources.model,
          resources.server ?? serverResource,
          serverResourceTemplateName,
          overwrite,
          initialWizardData,
          applyAllFieldDataFn,
          runPreDeploy,
          runPostDeploy,
        );

        try {
          await fireModelDeployedTracking('submit', true);
        } catch {
          // Telemetry must not block navigation after a successful deploy.
        }
        exitWizardOnSubmit();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setSubmitError(error instanceof Error ? error : new Error(errorMessage));

        try {
          await fireModelDeployedTracking('submit', false, errorMessage);
        } catch {
          // Telemetry must not mask the deploy failure shown to the user.
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      viewMode,
      externalData,
      validation.isAllValid,
      deployMethodLoaded,
      deployMethod,
      applyExtensionsLoaded,
      preDeployExtensionsLoaded,
      postDeployExtensionsLoaded,
      formState,
      secretOps,
      resources,
      connectionSecretName,
      existingDeployment,
      initialWizardData,
      applyAllFieldDataFn,
      runPreDeploy,
      runPostDeploy,
      exitWizardOnSubmit,
      yamlError,
      fireModelDeployedTracking,
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
