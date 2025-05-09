import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Table } from '~/components/table';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { KnownLabels } from '~/k8sTypes';
import RegisteredModelTableRow from './RegisteredModelTableRow';
import { rmColumns } from './RegisteredModelsTableColumns';

type RegisteredModelTableProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const RegisteredModelTable: React.FC<RegisteredModelTableProps> = ({
  clearFilters,
  registeredModels,
  toolbarContent,
  refresh,
}) => {
  const { mrName } = useParams();
  const inferenceServices = useInferenceServices(undefined, undefined, undefined, mrName);
  const hasDeploys = (rmId: string) =>
    !!inferenceServices.data.items.some(
      (s) => s.metadata.labels?.[KnownLabels.REGISTERED_MODEL_ID] === rmId,
    );
  return (
    <Table
      data-testid="registered-model-table"
      data={registeredModels}
      columns={rmColumns}
      toolbarContent={toolbarContent}
      defaultSortColumn={2}
      onClearFilters={clearFilters}
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
      rowRenderer={(rm) => (
        <RegisteredModelTableRow
          key={rm.name}
          hasDeploys={hasDeploys(rm.id)}
          registeredModel={rm}
          refresh={refresh}
        />
      )}
    />
  );
};

export default RegisteredModelTable;
