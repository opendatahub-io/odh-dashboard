import React from 'react';
import { useSecretOps } from '@odh-dashboard/plugin-core';
import { byName } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getServingRuntimeFromTemplate, isTemplateKind } from '@odh-dashboard/model-serving/shared';
import { useDeployMethod } from './useDeployMethod';
import { useWizardFieldPreDeploy } from './useWizardFieldPreDeploy';
import { useWizardFieldPostDeploy } from './useWizardFieldPostDeploy';
import { ModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import { useWizardFieldApply } from '../useWizardFieldApply';
import { deployModel, getConnectionSecret } from '../utils';
import { Deployment } from '../../../../extension-points';
import {
  DeploymentAssemblyResources,
  DeployMethodActivationInput,
} from '../../../../extension-points/deployment-wizard';
import { InitialWizardFormData } from '../../../shared/types/form-data';
import { WizardFormState } from '../useDeploymentWizardReducer';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';
import { ExternalDataMap, isExternalDataReady } from '../ExternalDataLoader';
import { useModelDeployedTracking } from '../../../shared/tracking/useModelDeployedTracking';

/**
 * Get the onSubmit function to create / update the deployment.
 *
 * @returns The onSubmit function to create / update the deployment
 */
export const useModelDeploymentSubmit = (
  formState: WizardFormState, // Need initial data for existing auth secrets
  deployMethodActivationInput: DeployMethodActivationInput,
  resources: DeploymentAssemblyResources<Deployment>,
  validation: ModelDeploymentWizardValidation,
  externalData: ExternalDataMap,
  exitWizardOnSubmit: () => void,
  viewMode: ModelDeploymentWizardViewMode = 'form',
  initialWizardData?: InitialWizardFormData,
  existingDeployment?: Deployment,
  yamlErrors?: Error[],
): {
  onSave: (overwrite?: boolean) => Promise<void>;
  onOverwrite?: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  isReadinessLoading: boolean;
  submitError: Error | null;
  clearSubmitError: () => void;
} => {
  const secretOps = useSecretOps();
  const { deploymentTargetProjects } = React.useContext(ProjectsContext);
  const { deployMethod, deployMethodLoaded } = useDeployMethod(
    deployMethodActivationInput,
    resources,
  );
  const { fireModelDeployedTracking } = useModelDeployedTracking(
    formState,
    initialWizardData,
    deployMethod?.properties.platform,
    !!existingDeployment,
    externalData,
    resources,
  );
  const { applyAllFieldDataFn, applyExtensionsLoaded } = useWizardFieldApply(
    formState,
    initialWizardData?.navSourceMetadata,
  );
  const { runPreDeploy, preDeployExtensionsLoaded } = useWizardFieldPreDeploy(formState);
  const { runPostDeploy, postDeployExtensionsLoaded } = useWizardFieldPostDeploy(formState);

  const isReadinessLoading =
    !deployMethodLoaded ||
    !applyExtensionsLoaded ||
    !preDeployExtensionsLoaded ||
    !postDeployExtensionsLoaded;
  const isReady = !isReadinessLoading && !!deployMethod;

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
        if (viewMode === 'yaml-edit' && yamlErrors && yamlErrors.length > 0) {
          throw yamlErrors[0];
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
        if (!isReady) {
          throw new Error(
            'Deploy method or extensions not loaded or could not be inferred from resources',
          );
        }
        // Permissions are checked in one project, so the YAML must deploy to
        // that same project: the selected one for a new deployment, the
        // deployment's own for an edit.
        const yamlNamespace = resources.model?.metadata.namespace;
        const expectedNamespace = existingDeployment
          ? existingDeployment.model.metadata.namespace
          : formState.project.projectName;
        if (yamlNamespace && expectedNamespace && yamlNamespace !== expectedNamespace) {
          throw new Error(
            `The YAML namespace "${yamlNamespace}" must match the project "${expectedNamespace}".`,
          );
        }
        // Access to a project can be revoked while the wizard is open. A new
        // deployment, from the form or the YAML, must still target a project
        // the caller may deploy to; an edit stays in the deployment's project.
        const targetName = expectedNamespace ?? yamlNamespace;
        if (
          !existingDeployment &&
          deploymentTargetProjects &&
          targetName &&
          !deploymentTargetProjects.some(byName(targetName))
        ) {
          throw new Error(`You can no longer deploy models to the project "${targetName}".`);
        }

        // Prefer the Template on the shared model-server selection (spokes attach it).
        // Fall back to modelFormatState lookup — existing tech debt for predictive flows.
        const selection = formState.modelServer?.data?.selection;
        const serverResourceTemplateName = selection?.name;
        const templateFromSelection =
          selection?.template && isTemplateKind(selection.template)
            ? selection.template
            : undefined;
        const serverResource = getServingRuntimeFromTemplate(
          templateFromSelection ??
            formState.modelFormatState.templatesFilteredForModelType?.find(
              (template) => template.metadata.name === serverResourceTemplateName,
            ),
        );

        await deployModel(
          formState,
          externalData,
          secretOps,
          getConnectionSecret(formState),
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
          await fireModelDeployedTracking('submit', false);
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
      yamlErrors,
      resources.model,
      resources.server,
      isReady,
      deployMethod,
      formState,
      secretOps,
      existingDeployment,
      deploymentTargetProjects,
      initialWizardData,
      applyAllFieldDataFn,
      runPreDeploy,
      runPostDeploy,
      exitWizardOnSubmit,
      fireModelDeployedTracking,
    ],
  );

  return React.useMemo(
    () => ({
      onSave,
      onOverwrite: deployMethod?.properties.supportsOverwrite ? () => onSave(true) : undefined,
      isLoading,
      isReady,
      isReadinessLoading,
      submitError,
      clearSubmitError: () => setSubmitError(null),
    }),
    [
      onSave,
      deployMethod?.properties.supportsOverwrite,
      isLoading,
      isReady,
      isReadinessLoading,
      submitError,
    ],
  );
};
