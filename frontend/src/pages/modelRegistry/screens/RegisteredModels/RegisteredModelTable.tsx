import * as React from 'react';
import { Table } from '~/components/table';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { rmColumns } from './RegisteredModelsTableColumns';
import RegisteredModelTableRow from './RegisteredModelTableRow';

type RegisteredModelTableProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const RegisteredModelTable: React.FC<RegisteredModelTableProps> = ({
  clearFilters,
  registeredModels,
  toolbarContent,
}) => (
  <Table
    data-testid="registered-model-table"
    data={registeredModels}
    columns={rmColumns}
    toolbarContent={toolbarContent}
    enablePagination
    emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
    rowRenderer={(rm) => <RegisteredModelTableRow key={rm.name} registeredModel={rm} />}
  />
);

export default RegisteredModelTable;
