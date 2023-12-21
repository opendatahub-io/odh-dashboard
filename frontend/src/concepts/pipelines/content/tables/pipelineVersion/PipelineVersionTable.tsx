import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { TableBase, getTableColumnSort } from '~/components/table';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionColumns } from '~/concepts/pipelines/content/tables/columns';
import { useCheckboxTable } from '~/components/table';
import PipelineVersionTableRow from '~/concepts/pipelines/content/tables/pipelineVersion/PipelineVersionTableRow';
import { usePipelineVersionLoadMore } from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';

type PipelineVersionTableProps = {
  pipelineId: string;
  initialVersions: PipelineVersionKF[];
  nextPageToken?: string;
  loading?: boolean;
  totalSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  pipelineDetailsPath: (namespace: string, id: string) => string;
};

const PipelineVersionTable: React.FC<PipelineVersionTableProps> = ({
  pipelineId,
  initialVersions,
  nextPageToken,
  loading,
  totalSize,
  sortField,
  sortDirection,
  pipelineDetailsPath,
  ...tableProps
}) => {
  const { data: versions, onLoadMore } = usePipelineVersionLoadMore({
    pipelineId,
    initialData: initialVersions,
    initialPageToken: nextPageToken,
    sortDirection,
    sortField,
    loaded: !loading,
  });
  const {
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCheckboxTable(versions.map(({ id }) => id));

  return (
    <TableBase
      {...tableProps}
      {...checkboxTableProps}
      loading={loading}
      itemCount={totalSize}
      data={versions}
      columns={pipelineVersionColumns}
      rowRenderer={(version) => (
        <PipelineVersionTableRow
          key={version.id}
          isChecked={isSelected(version.id)}
          onToggleCheck={() => toggleSelection(version.id)}
          version={version}
          pipelineVersionDetailsPath={pipelineDetailsPath}
        />
      )}
      variant={TableVariant.compact}
      borders={false}
      getColumnSort={getTableColumnSort({
        columns: pipelineVersionColumns,
        sortField,
        sortDirection,
        ...tableProps,
      })}
      footerRow={() =>
        !loading ? (
          <PipelineViewMoreFooterRow
            visibleLength={versions.length}
            totalSize={totalSize}
            errorTitle="Error loading more pipeline versions"
            onClick={onLoadMore}
            isIndented
            colSpan={5}
          />
        ) : null
      }
    />
  );
};

export default PipelineVersionTable;
