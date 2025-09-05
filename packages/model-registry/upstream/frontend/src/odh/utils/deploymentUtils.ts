import * as React from 'react';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { ModelVersion } from '../../app/types';

type DeploymentDetectionResult = {
  hasDeployment: boolean;
  loaded: boolean;
};

export const useModelDeploymentDetection = () => {
  const { deployments, loaded } = useDeploymentsState();

  const hasModelVersionDeployment = React.useCallback((mvId: string): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      // Conservative approach: assume deployment exists during loading to prevent flicker
      return { hasDeployment: true, loaded };
    }

    // Check if this specific model version has deployments
    // Note: May be redundant if API already filtered by MODEL_VERSION_ID labelSelector
    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model?.kind === 'InferenceService';
      const modelVersionId = deployment.model?.metadata?.labels?.['modelregistry.opendatahub.io/model-version-id'];
      return isInferenceService && modelVersionId === mvId;
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  const hasRegisteredModelDeploymentByVersionIds = React.useCallback((mvIds: string[]): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      return { hasDeployment: true, loaded };
    }

    if (mvIds.length === 0) {
      return { hasDeployment: false, loaded };
    }

    // Check if any of the specified model versions have deployments
    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model?.kind === 'InferenceService';
      const modelVersionId = deployment.model?.metadata?.labels?.['modelregistry.opendatahub.io/model-version-id'];
      return isInferenceService && modelVersionId && mvIds.includes(modelVersionId);
    });

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  const hasRegisteredModelDeployment = React.useCallback((rmId: string, modelVersions: ModelVersion[]): DeploymentDetectionResult => {
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    const mvIds = modelVersionsForRM.map(mv => mv.id);
    return hasRegisteredModelDeploymentByVersionIds(mvIds);
  }, [hasRegisteredModelDeploymentByVersionIds]);

  return {
    hasModelVersionDeployment,
    hasRegisteredModelDeployment,
    hasRegisteredModelDeploymentByVersionIds,
    loaded,
    deployments
  };
};
