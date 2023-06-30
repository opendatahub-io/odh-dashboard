import * as React from 'react';
import { TableVariant, Tr } from '@patternfly/react-table';
import Table from '~/components/table/Table';
import {
  ExperimentKF,
  PipelineCoreResourceKF,
  PipelineRunJobKF,
} from '~/concepts/pipelines/kfTypes';
import {
  pipelineRunJobColumns,
  pipelineRunJobExperimentColumns,
} from '~/concepts/pipelines/content/tables/columns';
import useCheckboxTable from '~/components/table/useCheckboxTable';
import PipelineRunJobTableRow from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableRow';
import PipelineRunJobTableToolbar from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import usePipelineRunJobFilter from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobFilter';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ToggleGroupOption } from '~/concepts/pipelines/content/tables/ExperimentToggleGroup';
import ExperimentsTable from '~/concepts/pipelines/content/tables/experiments/ExperimentsTable';

type PipelineRunTableProps = {
  jobs: PipelineRunJobKF[];
  experiments: ExperimentKF[];
};

const PipelineRunJobTable: React.FC<PipelineRunTableProps> = ({ jobs, experiments }) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [toggleGroup, setToggleGroup] = React.useState<ToggleGroupOption>(
    ToggleGroupOption.RUN_VIEW,
  );
  const [filterJobs, toolbarProps] = usePipelineRunJobFilter(jobs);
  const { selections, tableProps, toggleSelection, isSelected } = useCheckboxTable(
    filterJobs.map(({ id }) => id),
  );
  const [deleteResources, setDeleteResources] = React.useState<PipelineCoreResourceKF[]>([]);

  const toolbarContent = (
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
  );

  return (
    <>
      {toggleGroup === ToggleGroupOption.RUN_VIEW ? (
        <Table
          {...tableProps}
          data={filterJobs}
          columns={pipelineRunJobColumns}
          enablePagination
          emptyTableView={<DashboardEmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
          toolbarContent={toolbarContent}
          rowRenderer={(job) => (
            <Tr key={job.id}>
              <PipelineRunJobTableRow
                isChecked={isSelected(job.id)}
                onToggleCheck={() => toggleSelection(job.id)}
                onDelete={() => setDeleteResources([job])}
                job={job}
              />
            </Tr>
          )}
          variant={TableVariant.compact}
        />
      ) : (
        <ExperimentsTable
          data={filterJobs}
          experiments={experiments}
          columns={pipelineRunJobExperimentColumns}
          enablePagination
          emptyTableView={<DashboardEmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
          toolbarContent={toolbarContent}
          rowRenderer={(resource) => (
            <PipelineRunJobTableRow
              isExpandable
              key={resource.id}
              onDelete={() => setDeleteResources([resource])}
              job={resource as PipelineRunJobKF}
            />
          )}
        />
      )}

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
