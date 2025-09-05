import * as React from 'react';
import { ModelVersion, RegisteredModel } from '../../app/types';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import RegisteredModelTableRow from '../../app/pages/modelRegistry/screens/RegisteredModels/RegisteredModelTableRow';
import { getLatestVersionForRegisteredModel } from '../../app/pages/modelRegistry/screens/utils';

type RegisteredModelTableWithDeploymentProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
  children: (props: {
    rowRenderer: (rm: RegisteredModel) => JSX.Element;
  }) => React.ReactNode;
};

/**
 * Wrapper component that provides deployment-aware rowRenderer for RegisteredModelTable
 * Encapsulates all deployment detection logic and keeps the core table component clean
 */
export const OdhRegisteredModelTableWrapper: React.FC<RegisteredModelTableWithDeploymentProps> = ({
  clearFilters,
  registeredModels,
  modelVersions,
  refresh,
  children,
}) => {
  const { deployments, loaded } = useDeploymentsState();
  
  const hasDeploysForModel = React.useCallback((rmId: string) => {
    if (!loaded || !deployments) {
      // Conservative approach during loading
      return true;
    }

    // Get model version IDs for this specific registered model
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    const mvIds = modelVersionsForRM.map(mv => mv.id);
    
    if (mvIds.length === 0) {
      return false;
    }

    // Check if any deployment exists for this specific registered model's versions
    const hasDeployment = deployments.some(deployment => {
      const isInferenceService = deployment.model?.kind === 'InferenceService';
      const deploymentModelVersionId = deployment.model?.metadata?.labels?.['modelregistry.opendatahub.io/model-version-id'];
      const deploymentRegisteredModelId = deployment.model?.metadata?.labels?.['modelregistry.opendatahub.io/registered-model-id'];
      
      return isInferenceService && 
             deploymentModelVersionId && mvIds.includes(deploymentModelVersionId) &&
             deploymentRegisteredModelId === rmId;
    });

    return hasDeployment;
  }, [deployments, loaded, modelVersions]);

  const enhancedRowRenderer = React.useCallback((rm: RegisteredModel) => (
    <RegisteredModelTableRow
      key={rm.name}
      hasDeploys={hasDeploysForModel(rm.id)}
      loaded={loaded}
      registeredModel={rm}
      latestModelVersion={getLatestVersionForRegisteredModel(modelVersions, rm.id)}
      refresh={refresh}
    />
  ), [hasDeploysForModel, loaded, modelVersions, refresh]);

  return <>{children({ rowRenderer: enhancedRowRenderer })}</>;
};
