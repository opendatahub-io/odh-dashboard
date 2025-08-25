import * as React from 'react';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { KnownLabels } from '../k8sTypes';
import { ModelVersion } from '~/app/types';

export type DeploymentDetectionResult = {
  hasDeployment: boolean;
  loaded: boolean;
};

export const useModelDeploymentDetection = () => {
  const { deployments, loaded } = useDeploymentsState();
  const hasModelVersionDeployment = React.useCallback((mvId: string): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      // Conservative approach: assume deployment exists during loading to prevent flicker
      // This keeps the archive button disabled until we're sure there are no deployments
      return { hasDeployment: true, loaded };
    }

    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model.kind === 'InferenceService';
      const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
      return isInferenceService && modelVersionId === mvId;
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  const hasRegisteredModelDeployment = React.useCallback((rmId: string, modelVersions: ModelVersion[]): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      // Conservative approach: assume deployment exists during loading to prevent flicker
      return { hasDeployment: true, loaded };
    }

    // Get all model version IDs for this registered model
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    const mvIds = modelVersionsForRM.map(mv => mv.id);

    // If no model versions, no deployments possible
    if (mvIds.length === 0) {
      return { hasDeployment: false, loaded };
    }

    // Check if any model version of this registered model is deployed
    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model.kind === 'InferenceService';
      const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
      return isInferenceService && modelVersionId && mvIds.includes(modelVersionId);
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  // Alternative method for registered model deployment check when model versions are fetched separately
  const hasRegisteredModelDeploymentByVersionIds = React.useCallback((mvIds: string[]): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      // Conservative approach: assume deployment exists during loading to prevent flicker
      return { hasDeployment: true, loaded };
    }

    if (mvIds.length === 0) {
      return { hasDeployment: false, loaded };
    }

    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model.kind === 'InferenceService';
      const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
      return isInferenceService && modelVersionId && mvIds.includes(modelVersionId);
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  return {
    hasModelVersionDeployment,
    hasRegisteredModelDeployment,
    hasRegisteredModelDeploymentByVersionIds,
    loaded,
    deployments
  };
};
