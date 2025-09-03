import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { getLatestVersionForRegisteredModel } from '~/app/pages/modelRegistry/screens/utils';
import { rmColumns } from './RegisteredModelsTableColumns';
import RegisteredModelTableRow from './RegisteredModelTableRow';
import { useModelDeploymentDetection } from '~/odh/utils/deploymentUtils';

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
  const { hasRegisteredModelDeployment, loaded } = useModelDeploymentDetection();
  
  const hasDeploysForModel = React.useCallback((rmId: string) => {
    const { hasDeployment } = hasRegisteredModelDeployment(rmId, modelVersions);
    return hasDeployment;
  }, [hasRegisteredModelDeployment, modelVersions]);

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
          hasDeploys: hasDeploysForModel(rm.id), 
          loaded 
        };
        
        return (
          <RegisteredModelTableRow
            key={rm.name}
            hasDeploys={deploymentInfo.hasDeploys}
            loaded={deploymentInfo.loaded}
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
