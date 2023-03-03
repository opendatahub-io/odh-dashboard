import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import Table from '~/components/Table';

import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
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
  const {
    projects: { data: projects },
  } = React.useContext(ModelServingContext);
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
          isGlobal ? (
            <>
              No projects match your filters.{' '}
              <Button variant="link" isInline onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : undefined
        }
        rowRenderer={(is) => (
          <InferenceServiceTableRow
            key={is.metadata.uid}
            obj={is}
            servingRuntime={servingRuntimes.find(
              (sr) => sr.metadata.name === is.spec.predictor.model.runtime,
            )}
            isGlobal={isGlobal}
            onDeleteInferenceService={setDeleteInferenceService}
            onEditInferenceService={setEditInferenceService}
          />
        )}
      />
      <DeleteInferenceServiceModal
        inferenceService={deleteInferenceService}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteInferenceService(undefined);
        }}
      />
      <ManageInferenceServiceModal
        isOpen={editInferenceService !== undefined}
        editInfo={editInferenceService}
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
