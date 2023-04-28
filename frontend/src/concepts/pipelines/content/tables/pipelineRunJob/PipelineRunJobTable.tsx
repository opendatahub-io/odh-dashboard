import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import Table from '~/components/table/Table';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { pipelineRunJobColumns } from '~/concepts/pipelines/content/tables/columns';
import useCheckboxTable from '~/components/table/useCheckboxTable';
import PipelineRunJobTableRow from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableRow';
import PipelineRunJobTableToolbar from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import usePipelineRunJobFilter from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobFilter';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';

type PipelineRunTableProps = {
  jobs: PipelineRunJobKF[];
};

const PipelineRunJobTable: React.FC<PipelineRunTableProps> = ({ jobs }) => {
  const { selections, tableProps, toggleSelection, isSelected } = useCheckboxTable(
    jobs.map(({ id }) => id),
  );
  const [filterJobs, toolbarProps] = usePipelineRunJobFilter(jobs);
  const [, setDeleteIds] = React.useState<string[]>([]); // TODO: make modal

  return (
    <>
      <Table
        {...tableProps}
        data={filterJobs}
        columns={pipelineRunJobColumns}
        enablePagination
        emptyTableView={<EmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
        toolbarContent={
          <PipelineRunJobTableToolbar
            {...toolbarProps}
            deleteAllEnabled={selections.length > 0}
            onDeleteAll={() => setDeleteIds(selections)}
          />
        }
        rowRenderer={(job) => (
          <PipelineRunJobTableRow
            key={job.id}
            isChecked={isSelected(job.id)}
            onToggleCheck={() => toggleSelection(job.id)}
            onDelete={() => setDeleteIds([job.id])}
            job={job}
          />
        )}
        variant={TableVariant.compact}
      />
    </>
  );
};

export default PipelineRunJobTable;
