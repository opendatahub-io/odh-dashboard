import * as React from 'react';
import { ModelVersion, RegisteredModel } from '../../app/types';
import { useModelDeploymentDetection } from '../utils/deploymentUtils';
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
  const { hasRegisteredModelDeployment, loaded } = useModelDeploymentDetection();
  
  const hasDeploysForModel = React.useCallback((rmId: string) => {
    const { hasDeployment } = hasRegisteredModelDeployment(rmId, modelVersions);
    return hasDeployment;
  }, [hasRegisteredModelDeployment, modelVersions]);

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
