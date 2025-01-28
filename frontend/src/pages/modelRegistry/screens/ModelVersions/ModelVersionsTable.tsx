import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Table } from '~/components/table';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { KnownLabels } from '~/k8sTypes';
import { mvColumns } from './ModelVersionsTableColumns';
import ModelVersionsTableRow from './ModelVersionsTableRow';

type ModelVersionsTableProps = {
  clearFilters: () => void;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ModelVersionsTable: React.FC<ModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
}) => {
  const { mrName, registeredModelId } = useParams();
  const inferenceServices = useMakeFetchObject(
    useInferenceServices(undefined, registeredModelId, undefined, mrName),
  );
  const hasDeploys = (mvId: string) =>
    !!inferenceServices.data.some(
      (s) => s.metadata.labels?.[KnownLabels.MODEL_VERSION_ID] === mvId,
    );

  return (
    <Table
      data-testid="model-versions-table"
      data={modelVersions}
      columns={mvColumns}
      toolbarContent={toolbarContent}
      defaultSortColumn={3}
      enablePagination
      onClearFilters={clearFilters}
      emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
      rowRenderer={(mv) => (
        <ModelVersionsTableRow
          hasDeployment={hasDeploys(mv.id)}
          key={mv.name}
          modelVersion={mv}
          isArchiveModel={isArchiveModel}
          refresh={refresh}
        />
      )}
    />
  );
};

export default ModelVersionsTable;
