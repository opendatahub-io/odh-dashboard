import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { getLatestVersionForRegisteredModel } from '~/app/pages/modelRegistry/screens/utils';
import { rmColumns } from './RegisteredModelsTableColumns';
import RegisteredModelTableRow from './RegisteredModelTableRow';
import { useDeploymentsState } from '~/odh/hooks/useDeploymentsState';
import { KnownLabels } from '~/odh/k8sTypes';

type RegisteredModelTableProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
  getModelDeploymentInfo?: (rmId: string) => { hasDeploys: boolean; loaded: boolean };
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const RegisteredModelTableContent: React.FC<RegisteredModelTableProps> = ({
  clearFilters,
  registeredModels,
  modelVersions,
  toolbarContent,
  refresh,
  getModelDeploymentInfo,
}) => {
  const { deployments, loaded } = useDeploymentsState();
  
  const hasDeploysForModel = React.useCallback((rmId: string) => {
    if (!loaded || !deployments) {
      return false; // If deployments haven't loaded yet, assume no deployments
    }
    
    // Get all model versions for this registered model
    const modelVersionsForRM = modelVersions.filter(mv => mv.registeredModelId === rmId);
    const mvIds = modelVersionsForRM.map(mv => mv.id);
    
    // If no model versions, no deployments possible
    if (mvIds.length === 0) {
      return false;
    }
    
    // Check if any model version of this registered model is deployed
    // Use exact match logic like the working OdhModelVersionsTable
    return deployments.some(deployment => {
      const isInferenceService = deployment.model.kind === 'InferenceService';
      const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
      return isInferenceService && modelVersionId && mvIds.includes(modelVersionId);
    });
  }, [deployments, loaded, modelVersions]);

  return (
    <Table
      data-testid="registered-model-table"
      data={registeredModels}
      columns={rmColumns}
      toolbarContent={toolbarContent}
      defaultSortColumn={2}
      onClearFilters={clearFilters}
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
      rowRenderer={(rm: RegisteredModel) => {
        const deploymentInfo = getModelDeploymentInfo?.(rm.id) ?? { 
          hasDeploys: hasDeploysForModel(rm.id) && loaded, 
          loaded 
        };
        
        return (
          <RegisteredModelTableRow
            key={rm.name}
            hasDeploys={deploymentInfo.hasDeploys}
            registeredModel={rm}
            latestModelVersion={getLatestVersionForRegisteredModel(modelVersions, rm.id)}
            refresh={refresh}
          />
        );
      }}
    />
  );
};

const RegisteredModelTable: React.FC<RegisteredModelTableProps> = (props) => {
  // Use deployment context from parent (RegisteredModelListView)
  return <RegisteredModelTableContent {...props} />;
};

export default RegisteredModelTable;
