import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { TableBase, getTableColumnSort, useCheckboxTableBase } from '~/components/table';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineVersionTableRow from '~/concepts/pipelines/content/tables/pipelineVersion/PipelineVersionTableRow';
import { usePipelineVersionLoadMore } from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';

type PipelineVersionTableProps = {
  pipeline: PipelineKF;
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
  pipeline,
  initialVersions,
  nextPageToken,
  loading,
  totalSize,
  sortField,
  sortDirection,
  pipelineDetailsPath,
  ...tableProps
}) => {
  const pipelineId = pipeline.id;
  const { data: versions, onLoadMore } = usePipelineVersionLoadMore({
    pipelineId,
    initialData: initialVersions,
    initialPageToken: nextPageToken,
    sortDirection,
    sortField,
    loaded: !loading,
  });
  const { isPipelineChecked, versionDataSelector } = React.useContext(PipelineAndVersionContext);
  const pipelineChecked = isPipelineChecked(pipelineId);
  const { selectedVersions, setSelectedVersions } = versionDataSelector(pipeline);
  const {
    tableProps: checkboxTableProps,
    isSelected,
    toggleSelection,
  } = useCheckboxTableBase<PipelineVersionKF>(
    versions,
    selectedVersions,
    setSelectedVersions,
    (version) => version.id,
    { disabled: pipelineChecked, ...(pipelineChecked ? { selected: true } : {}) },
  );

  return (
    <TableBase
      {...checkboxTableProps}
      loading={loading}
      itemCount={totalSize}
      data={versions}
      columns={pipelineVersionColumns}
      rowRenderer={(version) => (
        <PipelineVersionTableRow
          key={version.id}
          isChecked={pipelineChecked || isSelected(version)}
          onToggleCheck={() => toggleSelection(version)}
          version={version}
          pipelineVersionDetailsPath={pipelineDetailsPath}
          isDisabled={pipelineChecked}
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
