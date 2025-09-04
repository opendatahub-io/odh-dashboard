import * as React from 'react';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { ModelVersion } from '../../app/types';

type DeploymentDetectionResult = {
  hasDeployment: boolean;
  loaded: boolean;
};

export const useModelDeploymentDetection = () => {
  const { deployments, loaded } = useDeploymentsState();
  const hasAnyDeployment = React.useCallback((): DeploymentDetectionResult => {
    if (!loaded || !deployments) {
      // Conservative approach: assume deployment exists during loading to prevent flicker
      return { hasDeployment: true, loaded };
    }

    const hasDeployment = deployments.some(deployment => 
      deployment.model?.kind === 'InferenceService'
    );

    return { hasDeployment, loaded };
  }, [deployments, loaded]);

  const hasModelVersionDeployment = React.useCallback((mvId: string): DeploymentDetectionResult => {
    return hasAnyDeployment();
  }, [hasAnyDeployment]);
 
  const hasRegisteredModelDeploymentByVersionIds = React.useCallback((mvIds: string[]): DeploymentDetectionResult => {
    if (mvIds.length === 0) {
      return { hasDeployment: false, loaded };
    }
    return hasAnyDeployment();
  }, [hasAnyDeployment]);

  const hasRegisteredModelDeployment = React.useCallback((rmId: string, modelVersions: ModelVersion[]): DeploymentDetectionResult => {
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    return hasRegisteredModelDeploymentByVersionIds(modelVersionsForRM.map(mv => mv.id));
  }, [hasRegisteredModelDeploymentByVersionIds]);

  return {
    hasModelVersionDeployment,
    hasRegisteredModelDeployment,
    hasRegisteredModelDeploymentByVersionIds,
    loaded,
    deployments
  };
};
