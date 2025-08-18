import * as React from 'react';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { mvColumns } from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableColumns';
import ModelVersionsTableRow from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableRow';
import { useDeploymentsState } from '~/odh/hooks/useDeploymentsState';
import { KnownLabels } from '~/odh/k8sTypes';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';

type OdhModelVersionsTableProps = {
    clearFilters: () => void;
    modelVersions: ModelVersion[];
    isArchiveModel?: boolean;
    refresh: () => void;
    rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const OdhModelVersionsTableContent: React.FC<Omit<OdhModelVersionsTableProps, 'rm'>> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
}) => {
    const { deployments, loaded } = useDeploymentsState();
    const hasDeploys = (mvId: string) =>
        !!deployments?.some(
            (s) => s.model.kind === 'InferenceService' && s.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID] === mvId,
        );
    return (
        <Table
            data-testid="model-versions-table"
            data={modelVersions}
            columns={mvColumns}
            toolbarContent={toolbarContent}
            defaultSortColumn={3}
            enablePagination
            onClearFilters={clearFilters}
            emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
            rowRenderer={(mv: ModelVersion) => (
                <ModelVersionsTableRow
                    key={mv.name}
                    modelVersion={mv}
                    isArchiveModel={isArchiveModel}
                    refresh={refresh}
                    hasDeployment={hasDeploys(mv.id) && loaded}
                />
            )}
        />
    );
}

const OdhModelVersionsTable: React.FC<OdhModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
  rm,
}) => {
    const labelSelectors = React.useMemo(() => {
        if (!rm.id) {
          return undefined;
        }
        return {
          [KnownLabels.REGISTERED_MODEL_ID]: rm.id,
        };
    }, [rm.id]);
    const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
    return (
        <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
            <OdhModelVersionsTableContent
                clearFilters={clearFilters}
                modelVersions={modelVersions}
                toolbarContent={toolbarContent}
                isArchiveModel={isArchiveModel}
                refresh={refresh}
            />
        </MRDeploymentsContextProvider>
    )
};


export default OdhModelVersionsTable;