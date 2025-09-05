import * as React from 'react';
import { ModelVersion, RegisteredModel } from '../../app/types';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { KnownLabels } from '../k8sTypes';
import RegisteredModelTableRow from '../../app/pages/modelRegistry/screens/RegisteredModels/RegisteredModelTableRow';
import { getLatestVersionForRegisteredModel } from '../../app/pages/modelRegistry/screens/utils';

// Simple helper to check if deployment is an InferenceService
const isInferenceService = (deployment: any) => deployment?.model?.kind === 'InferenceService';

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

    // Check if any deployment exists for this registered model
    // This avoids pagination/staleness issues with the modelVersions array
    const hasDeployment = deployments.some(deployment => {
      if (!isInferenceService(deployment)) {
        return false;
      }
      
      const deploymentRegisteredModelId = deployment.model?.metadata?.labels?.[KnownLabels.REGISTERED_MODEL_ID];
      return deploymentRegisteredModelId === rmId;
    });

    return hasDeployment;
  }, [deployments, loaded]);

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
