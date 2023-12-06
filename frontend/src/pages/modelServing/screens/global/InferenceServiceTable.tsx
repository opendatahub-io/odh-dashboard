import * as React from 'react';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { Table } from '~/components/table';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { isModelMesh } from '~/pages/modelServing/utils';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ResourceTr from '~/components/ResourceTr';
import InferenceServiceTableRow from './InferenceServiceTableRow';
import { getGlobalInferenceServiceColumns, getProjectInferenceServiceColumns } from './data';
import DeleteInferenceServiceModal from './DeleteInferenceServiceModal';

type InferenceServiceTableProps = {
  clearFilters?: () => void;
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const InferenceServiceTable: React.FC<InferenceServiceTableProps> = ({
  clearFilters,
  inferenceServices,
  servingRuntimes,
  refresh,
  enablePagination,
  toolbarContent,
}) => {
  const { modelServingProjects: projects } = React.useContext(ProjectsContext);
  const [deleteInferenceService, setDeleteInferenceService] =
    React.useState<InferenceServiceKind>();
  const [editInferenceService, setEditInferenceService] = React.useState<InferenceServiceKind>();
  const isGlobal = !!clearFilters;
  const mappedColumns = isGlobal
    ? getGlobalInferenceServiceColumns(projects)
    : getProjectInferenceServiceColumns();
  return (
    <>
      <Table
        data={inferenceServices}
        columns={mappedColumns}
        variant={isGlobal ? undefined : 'compact'}
        toolbarContent={toolbarContent}
        enablePagination={enablePagination}
        emptyTableView={
          isGlobal ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
        }
        rowRenderer={(is) => (
          <ResourceTr key={is.metadata.uid} resource={is}>
            <InferenceServiceTableRow
              obj={is}
              servingRuntime={servingRuntimes.find(
                (sr) => sr.metadata.name === is.spec.predictor.model.runtime,
              )}
              isGlobal={isGlobal}
              showServingRuntime={isGlobal}
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
                (sr) => sr.metadata.name === deleteInferenceService.spec.predictor.model.runtime,
              )
            : undefined
        }
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteInferenceService(undefined);
        }}
      />
      <ManageInferenceServiceModal
        isOpen={!!editInferenceService && isModelMesh(editInferenceService)}
        editInfo={editInferenceService}
        onClose={(edited) => {
          if (edited) {
            refresh();
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
                  (sr) => sr.metadata.name === editInferenceService.spec.predictor.model.runtime,
                )
              : undefined,
            secrets: [],
          },
        }}
        onClose={(edited) => {
          if (edited) {
            refresh();
          }
          setEditInferenceService(undefined);
        }}
      />
    </>
  );
};

export default InferenceServiceTable;
