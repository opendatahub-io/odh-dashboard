import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { getLatestVersionForRegisteredModel } from '~/app/pages/modelRegistry/screens/utils';
import { rmColumns } from './RegisteredModelsTableColumns';
import RegisteredModelTableRow from './RegisteredModelTableRow';
import { OdhRegisteredModelTableWrapper } from '~/odh/components/OdhRegisteredModelTable';

type RegisteredModelTableProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const RegisteredModelTable: React.FC<RegisteredModelTableProps> = ({
  clearFilters,
  registeredModels,
  modelVersions,
  toolbarContent,
  refresh,
}) => {
  return (
    <OdhRegisteredModelTableWrapper
      clearFilters={clearFilters}
      registeredModels={registeredModels}
      modelVersions={modelVersions}
      refresh={refresh}
    >
      {({ rowRenderer }) => (
        <Table
          data-testid="registered-model-table"
          data={registeredModels}
          columns={rmColumns}
          toolbarContent={toolbarContent}
          defaultSortColumn={2}
          onClearFilters={clearFilters}
          enablePagination
          emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
          rowRenderer={rowRenderer}
        />
      )}
    </OdhRegisteredModelTableWrapper>
  );
};

export default RegisteredModelTable;
