import * as React from 'react';
import { SortableData, Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import ModelVersionsTableRow from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableRow';
import { useModelDeploymentDetection } from '~/odh/utils/deploymentUtils';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { KnownLabels } from '../k8sTypes';

type OdhModelVersionsTableProps = {
    data: ModelVersion[];
    columns: SortableData<ModelVersion>[];
    defaultSortColumn: number;
    enablePagination: boolean;
    onClearFilters: () => void;
    emptyTableView: React.ReactNode;
    isArchiveModel?: boolean;
    refresh: () => void;
    rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const OdhModelVersionsTableContent: React.FC<Omit<OdhModelVersionsTableProps, 'rm'>> = ({
  data,
  columns,
  defaultSortColumn,
  enablePagination,
  onClearFilters,
  emptyTableView,
  toolbarContent,
  isArchiveModel,
  refresh,
  ...props
}) => {
    const { hasModelVersionDeployment, loaded } = useModelDeploymentDetection();
    const hasDeploys = (mvId: string) => {
        const { hasDeployment } = hasModelVersionDeployment(mvId);
        return hasDeployment;
    };
    return (
        <Table
            data={data}
            columns={columns}
            toolbarContent={toolbarContent}
            defaultSortColumn={defaultSortColumn}
            enablePagination={enablePagination}
            onClearFilters={onClearFilters}
            emptyTableView={emptyTableView}
            rowRenderer={(mv: ModelVersion) => (
                <ModelVersionsTableRow
                    key={mv.name}
                    modelVersion={mv}
                    isArchiveModel={isArchiveModel}
                    refresh={refresh}
                    hasDeployment={hasDeploys(mv.id)}
                    loaded={loaded}
                />
            )}
            {...props}
        />
    );
}

const OdhModelVersionsTable: React.FC<OdhModelVersionsTableProps> = ({
  data,
  columns,
  toolbarContent,
  defaultSortColumn,
  enablePagination,
  onClearFilters,
  emptyTableView,
  isArchiveModel,
  refresh,
  rm,
  ...props
}) => {
    const labelSelectors = {
        [KnownLabels.REGISTERED_MODEL_ID]: rm.id,
    }
    const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
    return (
        <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
            <OdhModelVersionsTableContent
                data={data}
                columns={columns}
                defaultSortColumn={defaultSortColumn}
                enablePagination={enablePagination}
                onClearFilters={onClearFilters}
                emptyTableView={emptyTableView}
                toolbarContent={toolbarContent}
                isArchiveModel={isArchiveModel}
                refresh={refresh}
                {...props}
            />
        </MRDeploymentsContextProvider>
    )
};


export default OdhModelVersionsTable;