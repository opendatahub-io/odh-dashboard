import React from 'react';
import { setupDefaults } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { type InitialWizardFormData } from './types';
import { getExternalRouteFromDeployment, getTokenAuthenticationFromDeployment } from './utils';
import { useWizardFieldExtractors } from './useWizardFieldExtractors';
import {
  type Deployment,
  type ExtractionResult,
  isModelServingDeploymentFormDataExtension,
} from '../../../extension-points';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';
import { useDeploymentAuthTokens } from '../../concepts/auth';

const collectExtractionErrors = (
  ...results: (ExtractionResult<unknown> | undefined | null)[]
): string[] => results.flatMap((r) => (r?.error ? [r.error] : []));

/**
 * Return type for the useExtractFormDataFromDeployment hook
 */
export type UseExtractFormDataFromDeploymentReturn = {
  /** The extracted form data from the deployment, undefined while loading or on error */
  formData: InitialWizardFormData | undefined;
  /** Whether all required data is still loading */
  loaded: boolean;
  /** Any errors that occurred during data loading */
  error: Error | undefined;
};

/**
 * Custom hook that extracts form data from an existing deployment for editing purposes.
 * This hook processes deployment data and transforms it into the format expected by
 * the deployment wizard form, enabling users to edit existing deployments.
 *
 * @param deployment - The deployment object to extract form data from
 * @returns Object containing form data, loading state, and error information
 *
 * @example
 * ```tsx
 * const { formData, loaded, error } = useExtractFormDataFromDeployment(deployment);
 *
 * if (!loaded) {
 *   return <LoadingSpinner />;
 * }
 *
 * if (error) {
 *   return <ErrorMessage error={error} />;
 * }
 *
 * // Use formData to populate the deployment wizard form
 * return <DeploymentWizard initialData={formData} />;
 * ```
 *
 * @remarks
 * - All form data extraction is memoized for performance
 * - Loading and error states are memoized to prevent unnecessary re-renders
 * - The hook handles both standard and platform-specific deployment configurations
 * - Form data is only available when both extension data and secrets are loaded
 */
export const useExtractFormDataFromDeployment = (
  deployment?: Deployment | null,
): UseExtractFormDataFromDeploymentReturn => {
  const { dashboardNamespace } = useDashboardNamespace();

  // Resolve deployment extension to get platform-specific form data extraction functions
  const [formDataExtension, formDataExtensionLoaded, formDataExtensionErrors] =
    useResolvedDeploymentExtension(isModelServingDeploymentFormDataExtension, deployment);

  // Fetch deployment authentication tokens/secrets
  const {
    data: deploymentSecrets,
    loaded: deploymentSecretsLoaded,
    error: deploymentSecretsError,
  } = useDeploymentAuthTokens(deployment);

  // Extract dynamic field data from packages for the deployment
  const { extractedFieldData, extractorsLoaded, extractorErrors } =
    useWizardFieldExtractors(deployment);

  const loaded =
    !deployment || (formDataExtensionLoaded && deploymentSecretsLoaded && extractorsLoaded);

  // Memoize error computation to prevent unnecessary recalculations
  const loadingError = React.useMemo((): Error | undefined => {
    if (!deployment) {
      return undefined;
    }
    if (formDataExtensionErrors.length > 0) {
      return new Error(formDataExtensionErrors[0]?.message || 'Failed to load form data extension');
    }
    if (deploymentSecretsError) {
      return new Error(deploymentSecretsError.message || 'Failed to load deployment secrets');
    }
    if (extractorErrors.length > 0) {
      const firstError = extractorErrors[0];
      const errorMessage =
        firstError instanceof Error ? firstError.message : 'Failed to load field extractors';
      return new Error(errorMessage);
    }
    return undefined;
  }, [deployment, formDataExtensionErrors, deploymentSecretsError, extractorErrors]);

  const hardwareProfileResult = React.useMemo(
    () =>
      deployment && loaded && !loadingError
        ? formDataExtension?.properties.extractHardwareProfileConfig(deployment)
        : undefined,
    [deployment, loaded, loadingError, formDataExtension],
  );

  const replicasResult = React.useMemo(
    () =>
      deployment && loaded && !loadingError
        ? formDataExtension?.properties.extractReplicas(deployment)
        : undefined,
    [deployment, loaded, loadingError, formDataExtension],
  );

  // Memoize the form data extraction to prevent unnecessary recalculations
  const formData = React.useMemo((): InitialWizardFormData | undefined => {
    // Only extract form data if everything is loaded and there are no loading errors
    if (!deployment || !loaded || loadingError) {
      return undefined;
    }

    return {
      modelTypeField:
        typeof formDataExtension?.properties.extractModelType === 'function'
          ? formDataExtension.properties.extractModelType(deployment) ?? undefined
          : undefined,

      // Setup K8s name and description fields with deployment model data
      k8sNameDesc: setupDefaults({ initialData: deployment.model }),

      hardwareProfile: hardwareProfileResult?.data ?? undefined,

      // Extract model format information if available
      modelFormat:
        typeof formDataExtension?.properties.extractModelFormat === 'function'
          ? formDataExtension.properties.extractModelFormat(deployment) ?? undefined
          : undefined,

      numReplicas: replicasResult?.data ?? undefined,

      // Extract model location data (where the model is stored)
      modelLocationData:
        formDataExtension?.properties.extractModelLocationData(deployment) ?? undefined,

      // Determine if external route is enabled for this deployment
      externalRoute: getExternalRouteFromDeployment(deployment),

      // Extract token authentication configuration
      tokenAuthentication: getTokenAuthenticationFromDeployment(deployment, deploymentSecrets),

      // Include existing authentication tokens
      existingAuthTokens: deploymentSecrets,

      // Extract deployment strategy configuration
      deploymentStrategy:
        typeof formDataExtension?.properties.extractDeploymentStrategy === 'function'
          ? formDataExtension.properties.extractDeploymentStrategy(deployment) ?? undefined
          : undefined,

      // Extract runtime arguments if available
      runtimeArgs: formDataExtension?.properties.extractRuntimeArgs(deployment) ?? undefined,

      // Extract environment variables configuration
      environmentVariables:
        formDataExtension?.properties.extractEnvironmentVariables(deployment) ?? undefined,

      // Extract model availability data
      modelAvailability:
        formDataExtension?.properties.extractModelAvailabilityData(deployment) ?? undefined,

      // Determine model server configuration based on deployment type
      modelServer:
        formDataExtension?.properties.extractModelServerTemplate(deployment, dashboardNamespace) ??
        undefined,
      // Always set to true for existing deployments
      isEditing: true,
      // Include extracted data from dynamic wizard fields (spread as top-level properties)
      ...extractedFieldData,
    };
  }, [
    deployment,
    formDataExtension,
    hardwareProfileResult,
    replicasResult,
    deploymentSecrets,
    dashboardNamespace,
    loaded,
    loadingError,
    extractedFieldData,
  ]);

  // Collect errors from platform-specific extract functions and validation
  const validationError = React.useMemo((): Error | undefined => {
    if (!deployment || loadingError || !formData) {
      return undefined;
    }

    const errors: string[] = [];

    errors.push(...collectExtractionErrors(hardwareProfileResult, replicasResult));

    if (typeof formDataExtension?.properties.validateExtraction === 'function') {
      errors.push(...formDataExtension.properties.validateExtraction(deployment));
    }

    const rawModelType = deployment.model.metadata.annotations?.['opendatahub.io/model-type'];
    if (rawModelType && !formData.modelTypeField) {
      errors.push(
        `Unsupported model type "${rawModelType}". Only "predictive" and "generative" are supported.`,
      );
    }

    if (errors.length > 0) {
      return new Error(
        'This deployment contains custom configuration that cannot be displayed in the form.',
      );
    }
    return undefined;
  }, [
    deployment,
    formData,
    formDataExtension,
    hardwareProfileResult,
    replicasResult,
    loadingError,
  ]);

  const error = loadingError || validationError;

  return {
    formData,
    loaded,
    error,
  };
};
