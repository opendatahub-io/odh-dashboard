import * as React from 'react';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { ModelVersion } from '../../app/types';
import { KnownLabels } from '../k8sTypes';

type DeploymentDetectionResult = {
  hasDeployment: boolean;
  loaded: boolean;
};

// Simple helper to check if deployment is an InferenceService
const isInferenceService = (deployment: any) => deployment?.model?.kind === 'InferenceService';

export const useModelDeploymentDetection = () => {
  const { deployments, loaded } = useDeploymentsState();


  const hasRegisteredModelDeploymentByVersionIds = React.useCallback((mvIds: string[]): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      return { hasDeployment: true, loaded };
    }

    if (mvIds.length === 0) {
      return { hasDeployment: false, loaded };
    }

    // Check if any of the specified model versions have deployments
    const mvIdSet = new Set(mvIds);
    const hasDeployment = deployments.some((deployment) => {
      if (!isInferenceService(deployment)) {
        return false;
      }
      
      const modelVersionId = deployment.model?.metadata?.labels?.[KnownLabels.MODEL_VERSION_ID];
      return modelVersionId && mvIdSet.has(modelVersionId);
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  const hasModelVersionDeployment = React.useCallback(
    (mvId: string): DeploymentDetectionResult =>
      hasRegisteredModelDeploymentByVersionIds([mvId]),
    [hasRegisteredModelDeploymentByVersionIds],
  );

  const hasRegisteredModelDeployment = React.useCallback((rmId: string, modelVersions: ModelVersion[]): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      return { hasDeployment: true, loaded };
    }

    // First check: Look for deployments with REGISTERED_MODEL_ID label to prevent false negatives
    // from stale/paginated modelVersions data
    const hasDeploymentByModelId = deployments.some(deployment => {
      if (!isInferenceService(deployment)) {
        return false;
      }
      
      const registeredModelId = deployment.model?.metadata?.labels?.[KnownLabels.REGISTERED_MODEL_ID];
      return registeredModelId === rmId;
    });

    if (hasDeploymentByModelId) {
      return { hasDeployment: true, loaded };
    }

    // Fallback check: Use model version IDs as secondary validation
    // (in case REGISTERED_MODEL_ID labels are missing on some deployments)
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    const mvIds = modelVersionsForRM.map(mv => mv.id);
    return hasRegisteredModelDeploymentByVersionIds(mvIds);
  }, [deployments, loaded, hasRegisteredModelDeploymentByVersionIds]);

  return {
    hasModelVersionDeployment,
    hasRegisteredModelDeployment,
    hasRegisteredModelDeploymentByVersionIds,
    loaded,
    deployments
  };
};
