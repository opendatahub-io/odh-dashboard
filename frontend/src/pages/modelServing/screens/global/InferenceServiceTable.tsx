import * as React from 'react';
import { SortableData, Table } from '#~/components/table';
import { InferenceServiceKind, ProjectKind, SecretKind, ServingRuntimeKind } from '#~/k8sTypes';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';

import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ResourceTr from '#~/components/ResourceTr';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
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
  onClearFilters?: () => void;
  filterTokens?: (servingRuntime?: string | undefined) => SecretKind[];
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const eventName = 'Model Deleted';
const InferenceServiceTable: React.FC<InferenceServiceTableProps> = ({
  inferenceServices,
  servingRuntimes,
  refresh,
  filterTokens,
  clearFilters,
  enablePagination,
  onClearFilters,
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
        onClearFilters={onClearFilters}
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
              refresh={refresh}
            />
          </ResourceTr>
        )}
      />
      {deleteInferenceService ? (
        <DeleteInferenceServiceModal
          inferenceService={deleteInferenceService}
          servingRuntime={servingRuntimes.find(
            (sr) => sr.metadata.name === deleteInferenceService.spec.predictor.model?.runtime,
          )}
          onClose={(deleted) => {
            fireFormTrackingEvent(eventName, {
              outcome: deleted ? TrackingOutcome.submit : TrackingOutcome.cancel,
              type: 'multi',
            });
            if (deleted) {
              refresh?.();
            }
            setDeleteInferenceService(undefined);
          }}
        />
      ) : null}
      {editInferenceService
        ? (() => {
            const projectForEdit = projects.find(byName(editInferenceService.metadata.namespace));
            const isNIM = projectForEdit ? isProjectNIMSupported(projectForEdit) : false;
            const KServeManageModalComponent = isNIM ? ManageNIMServingModal : ManageKServeModal;

            return (
              <KServeManageModalComponent
                editInfo={{
                  inferenceServiceEditInfo: editInferenceService,
                  servingRuntimeEditInfo: {
                    servingRuntime: servingRuntimes.find(
                      (sr) =>
                        sr.metadata.name === editInferenceService.spec.predictor.model?.runtime,
                    ),
                    secrets: [],
                  },
                  secrets: filterTokens
                    ? filterTokens(editInferenceService.spec.predictor.model?.runtime)
                    : [],
                }}
                onClose={(edited) => {
                  if (edited) {
                    refresh?.();
                  }
                  setEditInferenceService(undefined);
                }}
              />
            );
          })()
        : null}
    </>
  );
};

export default InferenceServiceTable;
