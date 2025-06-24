import * as React from 'react';
import { Table } from '#~/components/table';
import { LMEvalKind } from '#~/k8sTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import LMEvalTableRow from './LMEvalTableRow';
import { columns } from './const';
import DeleteLMEvalModal from './DeleteLMEvalModal';

type LMEvalTableProps = {
  lmEval: LMEvalKind[];
  lmEvalRefresh: () => void;
  clearFilters?: () => void;
  onClearFilters: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const LMEvalTable: React.FC<LMEvalTableProps> = ({
  lmEval,
  lmEvalRefresh,
  clearFilters,
  onClearFilters,
  toolbarContent,
}) => {
  const [deleteLMEval, setDeleteLMEval] = React.useState<LMEvalKind>();
  return (
    <>
      <Table
        data-testid="lm-eval-table"
        id="lm-eval-table"
        enablePagination
        data={lmEval}
        columns={columns}
        onClearFilters={onClearFilters}
        toolbarContent={toolbarContent}
        emptyTableView={
          clearFilters ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
        }
        rowRenderer={(cr) => (
          <LMEvalTableRow
            key={cr.metadata.uid}
            lmEval={cr}
            onDeleteLMEval={(i) => setDeleteLMEval(i)}
          />
        )}
      />

      {deleteLMEval ? (
        <DeleteLMEvalModal
          lmEval={deleteLMEval}
          onClose={(deleted) => {
            if (deleted) {
              lmEvalRefresh();
            }
            setDeleteLMEval(undefined);
          }}
        />
      ) : null}
    </>
  );
};
export default LMEvalTable;
