import React from 'react';
import { setupDefaults } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { type InitialWizardFormData } from './types';
import {
  getModelTypeFromDeployment,
  getExternalRouteFromDeployment,
  getTokenAuthenticationFromDeployment,
} from './utils';
import {
  type Deployment,
  isModelServingDeploymentFormDataExtension,
} from '../../../extension-points';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';
import { useDeploymentAuthTokens } from '../../concepts/auth';

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

  // Memoize the overall loading state to prevent unnecessary recalculations
  const loaded = React.useMemo(() => {
    return !deployment || (formDataExtensionLoaded && deploymentSecretsLoaded);
  }, [deployment, formDataExtensionLoaded, deploymentSecretsLoaded]);

  // Memoize error computation to prevent unnecessary recalculations
  const error = React.useMemo((): Error | undefined => {
    if (!deployment) {
      return undefined;
    }
    if (formDataExtensionErrors.length > 0) {
      return new Error(formDataExtensionErrors[0]?.message || 'Failed to load form data extension');
    }
    if (deploymentSecretsError) {
      return new Error(deploymentSecretsError.message || 'Failed to load deployment secrets');
    }
    return undefined;
  }, [deployment, formDataExtensionErrors, deploymentSecretsError]);

  // Memoize the form data extraction to prevent unnecessary recalculations
  const formData = React.useMemo((): InitialWizardFormData | undefined => {
    // Only extract form data if everything is loaded and there are no errors
    if (!deployment || !loaded || error) {
      return undefined;
    }

    return {
      // Extract model type information from deployment metadata
      modelTypeField: getModelTypeFromDeployment(deployment),

      // Setup K8s name and description fields with deployment model data
      k8sNameDesc: setupDefaults({ initialData: deployment.model }),

      // Extract hardware profile configuration if the extension supports it
      hardwareProfile:
        typeof formDataExtension?.properties.extractHardwareProfileConfig === 'function'
          ? formDataExtension.properties.extractHardwareProfileConfig(deployment) ?? undefined
          : undefined,

      // Extract model format information if available
      modelFormat:
        typeof formDataExtension?.properties.extractModelFormat === 'function'
          ? formDataExtension.properties.extractModelFormat(deployment) ?? undefined
          : undefined,

      // Extract replica count configuration
      numReplicas:
        typeof formDataExtension?.properties.extractReplicas === 'function'
          ? formDataExtension.properties.extractReplicas(deployment) ?? undefined
          : undefined,

      // Extract model location data (where the model is stored)
      modelLocationData:
        typeof formDataExtension?.properties.extractModelLocationData === 'function'
          ? formDataExtension.properties.extractModelLocationData(deployment) ?? undefined
          : undefined,

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
      runtimeArgs:
        typeof formDataExtension?.properties.extractRuntimeArgs === 'function'
          ? formDataExtension.properties.extractRuntimeArgs(deployment) ?? undefined
          : undefined,

      // Extract environment variables configuration
      environmentVariables:
        typeof formDataExtension?.properties.extractEnvironmentVariables === 'function'
          ? formDataExtension.properties.extractEnvironmentVariables(deployment) ?? undefined
          : undefined,

      // Extract model availability data
      modelAvailability:
        typeof formDataExtension?.properties.extractModelAvailabilityData === 'function'
          ? formDataExtension.properties.extractModelAvailabilityData(deployment) ?? undefined
          : undefined,

      // Determine model server configuration based on deployment type
      modelServer: (() => {
        // Handle special case for llmd-serving platform
        if (deployment.modelServingPlatformId === 'llmd-serving') {
          return {
            name: 'llmd-serving',
            label: 'Distributed Inference Server with llm-d',
          };
        }

        // Handle standard serving runtime deployments
        if (deployment.server) {
          const templateName =
            deployment.server.metadata.annotations?.['opendatahub.io/template-name'] || '';
          const scope =
            deployment.server.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] || '';

          return {
            name: templateName,
            namespace:
              scope === 'global' ? dashboardNamespace : deployment.server.metadata.namespace || '',
            scope,
          };
        }

        return undefined;
      })(),

      // Always set to true for existing deployments
      isEditing: true,
    };
  }, [deployment, formDataExtension, deploymentSecrets, dashboardNamespace, loaded, error]);

  return {
    formData,
    loaded,
    error,
  };
};
