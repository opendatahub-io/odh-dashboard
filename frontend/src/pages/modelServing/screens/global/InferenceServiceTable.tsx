import * as React from 'react';
import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { GetColumnSort } from '../../../../utilities/useTableColumnSort';
import { InferenceServiceKind, ServingRuntimeKind } from '../../../../k8sTypes';
import { inferenceServiceColumns } from './data';
import InferenceServiceTableRow from './InferenceServiceTableRow';
import DeleteInferenceServiceModal from './DeleteInferenceServiceModal';
import ManageInferenceServiceModal from '../projects/InferenceServiceModal/ManageInferenceServiceModal';

type InferenceServiceTableProps = {
  clearFilters?: () => void;
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  getColumnSort: GetColumnSort;
  refresh: () => void;
};

const InferenceServiceTable: React.FC<InferenceServiceTableProps> = ({
  clearFilters,
  inferenceServices,
  servingRuntimes,
  getColumnSort,
  refresh,
}) => {
  const [deleteInferenceService, setDeleteInferenceService] =
    React.useState<InferenceServiceKind>();
  const [editInferenceService, setEditInferenceService] = React.useState<InferenceServiceKind>();
  const isGlobal = !!clearFilters;
  const mappedColumns = isGlobal
    ? inferenceServiceColumns
    : inferenceServiceColumns.filter((column) => column.field !== 'project');
  return (
    <>
      <TableComposable variant={isGlobal ? undefined : 'compact'}>
        <Thead>
          <Tr>
            {mappedColumns.map((col, i) => (
              <Th key={col.field} sort={getColumnSort(i)} width={col.width}>
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        {isGlobal && inferenceServices.length === 0 && (
          <Tbody>
            <Tr>
              <Td colSpan={inferenceServiceColumns.length} style={{ textAlign: 'center' }}>
                No projects match your filters.{' '}
                <Button variant="link" isInline onClick={clearFilters}>
                  Clear filters
                </Button>
              </Td>
            </Tr>
          </Tbody>
        )}
        {inferenceServices.map((is) => (
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
        ))}
      </TableComposable>
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
