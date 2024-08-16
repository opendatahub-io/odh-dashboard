import * as React from 'react';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { SortableData, Table } from '~/components/table';
import { InferenceServiceKind, ProjectKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { isModelMesh } from '~/pages/modelServing/utils';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ResourceTr from '~/components/ResourceTr';
import InferenceServiceTableRow from './InferenceServiceTableRow';
import { getGlobalInferenceServiceColumns, getProjectInferenceServiceColumns } from './data';
import DeleteInferenceServiceModal from './DeleteInferenceServiceModal';

type InferenceServiceTableProps = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  isGlobal?: boolean;
  isLoading?: boolean;
  getColumns?: (projects: ProjectKind[]) => SortableData<InferenceServiceKind>[];
  refresh?: () => void;
  clearFilters?: () => void;
  filterTokens?: (servingRuntime?: string | undefined) => SecretKind[];
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const InferenceServiceTable: React.FC<InferenceServiceTableProps> = ({
  inferenceServices,
  servingRuntimes,
  refresh,
  filterTokens,
  clearFilters,
  enablePagination,
  toolbarContent,
  isGlobal,
  isLoading,
  getColumns,
}) => {
  const { modelServingProjects: projects } = React.useContext(ProjectsContext);
  const [deleteInferenceService, setDeleteInferenceService] =
    React.useState<InferenceServiceKind>();
  const [editInferenceService, setEditInferenceService] = React.useState<InferenceServiceKind>();
  const mappedColumns = React.useMemo(() => {
    const columns = getColumns?.(projects);

    if (columns) {
      return columns;
    }

    if (isGlobal) {
      return getGlobalInferenceServiceColumns(projects);
    }

    return getProjectInferenceServiceColumns();
  }, [getColumns, isGlobal, projects]);

  return (
    <>
      <Table
        data-testid="inference-service-table"
        data={inferenceServices}
        columns={mappedColumns}
        loading={isLoading}
        variant={isGlobal ? undefined : 'compact'}
        toolbarContent={toolbarContent}
        enablePagination={enablePagination}
        emptyTableView={
          clearFilters ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
        }
        rowRenderer={(is) => (
          <ResourceTr key={is.metadata.uid} resource={is}>
            <InferenceServiceTableRow
              obj={is}
              servingRuntime={servingRuntimes.find(
                (sr) => sr.metadata.name === is.spec.predictor.model?.runtime,
              )}
              isGlobal={isGlobal}
              columnNames={mappedColumns.map((column) => column.field)}
              onDeleteInferenceService={setDeleteInferenceService}
              onEditInferenceService={setEditInferenceService}
            />
          </ResourceTr>
        )}
      />
      <DeleteInferenceServiceModal
        isOpen={!!deleteInferenceService}
        inferenceService={deleteInferenceService}
        servingRuntime={
          deleteInferenceService && !isModelMesh(deleteInferenceService)
            ? servingRuntimes.find(
                (sr) => sr.metadata.name === deleteInferenceService.spec.predictor.model?.runtime,
              )
            : undefined
        }
        onClose={(deleted) => {
          if (deleted) {
            refresh?.();
          }
          setDeleteInferenceService(undefined);
        }}
      />
      <ManageInferenceServiceModal
        isOpen={!!editInferenceService && isModelMesh(editInferenceService)}
        editInfo={editInferenceService}
        onClose={(edited) => {
          if (edited) {
            refresh?.();
          }
          setEditInferenceService(undefined);
        }}
      />
      <ManageKServeModal
        isOpen={!!editInferenceService && !isModelMesh(editInferenceService)}
        editInfo={{
          inferenceServiceEditInfo: editInferenceService,
          servingRuntimeEditInfo: {
            servingRuntime: editInferenceService
              ? servingRuntimes.find(
                  (sr) => sr.metadata.name === editInferenceService.spec.predictor.model?.runtime,
                )
              : undefined,
            secrets: [],
          },
          secrets: filterTokens ? filterTokens(editInferenceService?.metadata.name) : [],
        }}
        onClose={(edited) => {
          if (edited) {
            refresh?.();
          }
          setEditInferenceService(undefined);
        }}
      />
    </>
  );
};

export default InferenceServiceTable;
