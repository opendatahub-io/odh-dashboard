import * as React from 'react';
import { Table } from '#~/components/table';
import { LMEvalKind } from '#~/k8sTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView.tsx';
import LMEvalTableRow from './LMEvalTableRow';
import { columns } from './const';

type LMEvalTableProps = {
  lmEval: LMEvalKind[];
  clearFilters?: () => void;
  onClearFilters: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const LMEvalTable: React.FC<LMEvalTableProps> = ({
  lmEval,
  clearFilters,
  onClearFilters,
  toolbarContent,
}) => (
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
    rowRenderer={(cr) => <LMEvalTableRow key={cr.metadata.name} lmEval={cr} />}
  />
);

export default LMEvalTable;
