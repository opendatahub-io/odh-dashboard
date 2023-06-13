import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import Table from '~/components/table/Table';
import { PipelineCoreResourceKF, PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { pipelineRunJobColumns } from '~/concepts/pipelines/content/tables/columns';
import useCheckboxTable from '~/components/table/useCheckboxTable';
import PipelineRunJobTableRow from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableRow';
import PipelineRunJobTableToolbar from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import usePipelineRunJobFilter from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobFilter';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ToggleGroupOption } from '~/concepts/pipelines/content/tables/ExperimentToggleGroup';

type PipelineRunTableProps = {
  jobs: PipelineRunJobKF[];
};

const PipelineRunJobTable: React.FC<PipelineRunTableProps> = ({ jobs }) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [toggleGroup, setToggleGroup] = React.useState<ToggleGroupOption>(
    ToggleGroupOption.RUN_VIEW,
  );
  const [filterJobs, toolbarProps] = usePipelineRunJobFilter(jobs);
  const { selections, tableProps, toggleSelection, isSelected } = useCheckboxTable(
    filterJobs.map(({ id }) => id),
  );
  const [deleteResources, setDeleteResources] = React.useState<PipelineCoreResourceKF[]>([]);

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
            toggleGroup={toggleGroup}
            onToggleGroupChange={(value) => setToggleGroup(value)}
            deleteAllEnabled={selections.length > 0}
            onDeleteAll={() =>
              setDeleteResources(
                selections
                  .map<PipelineCoreResourceKF | undefined>((selection) =>
                    jobs.find(({ id }) => id === selection),
                  )
                  .filter((v): v is PipelineCoreResourceKF => !!v),
              )
            }
          />
        }
        rowRenderer={(job) => (
          <PipelineRunJobTableRow
            key={job.id}
            isChecked={isSelected(job.id)}
            onToggleCheck={() => toggleSelection(job.id)}
            onDelete={() => setDeleteResources([job])}
            job={job}
          />
        )}
        variant={TableVariant.compact}
      />
      <DeletePipelineCoreResourceModal
        toDeleteResources={deleteResources}
        type="scheduled run"
        onClose={(deleted) => {
          if (deleted) {
            refreshAllAPI();
          }
          setDeleteResources([]);
        }}
      />
    </>
  );
};

export default PipelineRunJobTable;
