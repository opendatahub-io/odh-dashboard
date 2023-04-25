import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import Table from '~/components/table/Table';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { pipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import useCheckboxTable from '~/components/table/useCheckboxTable';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import usePipelineRunFilter from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunFilter';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';

type PipelineRunTableProps = {
  runs: PipelineRunKF[];
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({ runs }) => {
  const { tableProps, toggleSelection, isSelected } = useCheckboxTable(runs.map(({ id }) => id));
  const [filteredRuns, toolbarProps] = usePipelineRunFilter(runs);

  return (
    <>
      <Table
        {...tableProps}
        data={filteredRuns}
        columns={pipelineRunColumns}
        enablePagination
        emptyTableView={<EmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
        toolbarContent={<PipelineRunTableToolbar {...toolbarProps} />}
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.id}
            isChecked={isSelected(run.id)}
            onToggleCheck={() => toggleSelection(run.id)}
            onDelete={() => alert('should show delete modal')}
            run={run}
          />
        )}
        variant={TableVariant.compact}
      />
    </>
  );
};

export default PipelineRunTable;
