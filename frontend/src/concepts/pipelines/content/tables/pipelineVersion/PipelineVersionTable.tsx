import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { TableBase, getTableColumnSort } from '~/components/table';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineVersionTableRow from '~/concepts/pipelines/content/tables/pipelineVersion/PipelineVersionTableRow';
import { usePipelineVersionLoadMore } from '~/concepts/pipelines/content/tables/usePipelineLoadMore';
import PipelineViewMoreFooterRow from '~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';
import usePipelineVersionsCheckboxTable from '~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsCheckboxTable';
import DeletePipelinesModal from '~/concepts/pipelines/content/DeletePipelinesModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineVersionTableProps = {
  pipeline: PipelineKFv2;
  initialVersions: PipelineVersionKFv2[];
  nextPageToken?: string;
  loading?: boolean;
  totalSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
};

const PipelineVersionTable: React.FC<PipelineVersionTableProps> = ({
  pipeline,
  initialVersions,
  nextPageToken,
  loading,
  totalSize,
  sortField,
  sortDirection,
  ...tableProps
}) => {
  const pipelineId = pipeline.pipeline_id;
  const [versions, onLoadMore] = usePipelineVersionLoadMore(
    {
      initialData: initialVersions,
      initialPageToken: nextPageToken,
      loaded: !loading,
    },
    pipelineId,
  )({ sortDirection, sortField });
  const { isPipelineChecked } = React.useContext(PipelineAndVersionContext);
  const pipelineChecked = isPipelineChecked(pipelineId);
  const {
    tableProps: checkboxTableProps,
    isSelected,
    toggleSelection,
  } = usePipelineVersionsCheckboxTable(pipeline, versions);
  const { refreshAllAPI } = usePipelinesAPI();

  const [deleteVersions, setDeleteVersions] = React.useState<
    { pipelineName: string; version: PipelineVersionKFv2 }[]
  >([]);

  return (
    <>
      <TableBase
        {...checkboxTableProps}
        loading={loading}
        itemCount={totalSize}
        data={versions}
        columns={pipelineVersionColumns}
        rowRenderer={(version) => (
          <PipelineVersionTableRow
            key={version.pipeline_version_id}
            isChecked={pipelineChecked || isSelected(version)}
            onToggleCheck={() => toggleSelection(version)}
            version={version}
            isDisabled={pipelineChecked}
            pipeline={pipeline}
            onDeleteVersion={() =>
              setDeleteVersions([{ pipelineName: pipeline.display_name, version }])
            }
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
        data-testid="pipeline-versions-table"
      />
      <DeletePipelinesModal
        isOpen={deleteVersions.length !== 0}
        toDeletePipelineVersions={deleteVersions}
        onClose={(deleted) => {
          if (deleted) {
            refreshAllAPI();
          }
          setDeleteVersions([]);
        }}
      />
    </>
  );
};

export default PipelineVersionTable;
