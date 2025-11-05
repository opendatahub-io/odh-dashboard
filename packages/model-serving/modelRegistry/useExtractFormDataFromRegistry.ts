import React from 'react';
import {
  setupDefaults,
  handleUpdateLogic,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import { uriToModelLocation } from '@odh-dashboard/internal/concepts/modelRegistry/utils';
import { AccessTypes } from '@odh-dashboard/internal/pages/projects/dataConnections/const';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ConnectionTypeValueType } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  ModelLocationData,
  ModelLocationType,
  type InitialWizardFormData,
} from '../src/components/deploymentWizard/types';

/**
 * Return type for the useExtractFormDataFromRegistry hook
 */
export type UseExtractFormDataFromRegistryReturn = {
  /** The extracted form data from the model registry prefill info, undefined while loading or on error */
  formData: InitialWizardFormData | undefined;
  /** Whether all required data is still loading */
  loaded: boolean;
  /** Any errors that occurred during data loading */
  error: Error | undefined;
};

/**
 * Custom hook that extracts form data from model registry prefill information.
 * This hook processes model registry prefill data and transforms it into the format
 * expected by the deployment wizard form, enabling users to deploy models from the registry.
 *
 * @param modelDeployPrefill - The model deploy prefill object containing data, loaded state, and error
 * @returns Object containing form data, loading state, and error information
 *
 * @example
 * ```tsx
 * const { formData, loaded, error } = useExtractFormDataFromRegistry(modelDeployPrefill);
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
 * navigateToWizard('my-project', formData);
 * ```
 *
 * @remarks
 * - All form data extraction is memoized for performance
 * - Loading and error states are memoized to prevent unnecessary re-renders
 * - The hook handles loading connection types needed for model location data
 * - Form data is only available when both prefill data and connection types are loaded
 */
export const useExtractFormDataFromRegistry = (
  modelDeployPrefill?: {
    data: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
  } | null,
): UseExtractFormDataFromRegistryReturn => {
  // Load connection types to determine the connectionTypeObject
  const [connectionTypes, connectionTypesLoaded, connectionTypesError] =
    useWatchConnectionTypes(true);

  // Memoize the overall loading state (includes connection types loading)
  const loaded = React.useMemo(() => {
    return (!modelDeployPrefill || modelDeployPrefill.loaded) && connectionTypesLoaded;
  }, [modelDeployPrefill, connectionTypesLoaded]);

  // Memoize error computation
  const error = React.useMemo((): Error | undefined => {
    if (!modelDeployPrefill) {
      return connectionTypesError || undefined;
    }
    if (modelDeployPrefill.error) {
      return modelDeployPrefill.error;
    }
    return connectionTypesError || undefined;
  }, [modelDeployPrefill, connectionTypesError]);

  // Memoize the form data extraction
  const formData = React.useMemo((): InitialWizardFormData | undefined => {
    // Only extract form data if everything is loaded and there are no errors
    if (!modelDeployPrefill || !loaded || error) {
      return undefined;
    }

    const prefillInfo = modelDeployPrefill.data;

    // Setup defaults and then update with the model name
    // This ensures the k8s name is properly generated from the display name
    const baseK8sNameDesc = setupDefaults({});
    const k8sNameDesc = handleUpdateLogic(baseK8sNameDesc)('name', prefillInfo.modelName);

    const initialData: InitialWizardFormData = {
      // Set model name from prefill (k8s name will be auto-generated)
      k8sNameDesc,

      // Set model format if available
      modelFormat: prefillInfo.modelFormat
        ? {
            name: prefillInfo.modelFormat,
            version: prefillInfo.modelFormatVersion,
          }
        : undefined,

      // Set model registry info
      modelRegistryInfo: prefillInfo.modelRegistryInfo,

      // Set model location data
      modelLocationData: (() => {
        const modelLocation = uriToModelLocation(prefillInfo.modelArtifactUri);
        if (!modelLocation) {
          return undefined;
        }

        const connectionTypeObject = connectionTypes.find(
          (ct) => getResourceNameFromK8sResource(ct) === prefillInfo.connectionTypeName,
        );

        const fieldValues: Record<string, ConnectionTypeValueType> = {};
        const additionalFields: ModelLocationData['additionalFields'] = {};

        if (modelLocation.s3Fields) {
          fieldValues.AWS_S3_ENDPOINT = modelLocation.s3Fields.endpoint;
          fieldValues.AWS_S3_BUCKET = modelLocation.s3Fields.bucket;
          fieldValues.AWS_DEFAULT_REGION = modelLocation.s3Fields.region;
          additionalFields.modelPath = modelLocation.s3Fields.path;
        } else if (modelLocation.ociUri) {
          fieldValues.OCI_HOST = modelLocation.ociUri;
          fieldValues.ACCESS_TYPE = AccessTypes.PULL;
          additionalFields.modelUri = modelLocation.ociUri;
        } else if (modelLocation.uri) {
          fieldValues.URI = modelLocation.uri;
        } else {
          return undefined;
        }

        return {
          type: ModelLocationType.NEW,
          connectionTypeObject,
          fieldValues,
          additionalFields,
        };
      })(),
    };

    return initialData;
  }, [modelDeployPrefill, loaded, error, connectionTypes]);

  return {
    formData,
    loaded,
    error,
  };
};
