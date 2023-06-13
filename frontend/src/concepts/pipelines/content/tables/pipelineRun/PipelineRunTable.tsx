import * as React from 'react';
import { TableVariant, Tr } from '@patternfly/react-table';
import Table from '~/components/table/Table';
import { PipelineCoreResourceKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import {
  pipelineRunColumns,
  pipelineRunExperimentColumns,
} from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import useCheckboxTable from '~/components/table/useCheckboxTable';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import usePipelineRunFilter from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunFilter';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useJobRelatedInformation from '~/concepts/pipelines/content/tables/pipelineRun/useJobRelatedInformation';
import { ToggleGroupOption } from '~/concepts/pipelines/content/tables/ExperimentToggleGroup';
import ExperimentsTable from '~/concepts/pipelines/content/tables/experiments/ExperimentsTable';

type PipelineRunTableProps = {
  runs: PipelineRunKF[];
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({ runs }) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [toggleGroup, setToggleGroup] = React.useState<ToggleGroupOption>(
    ToggleGroupOption.RUN_VIEW,
  );
  const [filteredRuns, toolbarProps] = usePipelineRunFilter(runs);
  const { selections, tableProps, toggleSelection, isSelected } = useCheckboxTable(
    filteredRuns.map(({ id }) => id),
  );
  const [deleteResources, setDeleteResources] = React.useState<PipelineCoreResourceKF[]>([]);
  const { getJobInformation } = useJobRelatedInformation();

  const toolbarContent = (
    <PipelineRunTableToolbar
      {...toolbarProps}
      toggleGroup={toggleGroup}
      onToggleGroupChange={(value) => setToggleGroup(value)}
      deleteAllEnabled={selections.length > 0}
      onDeleteAll={() =>
        setDeleteResources(
          selections
            .map<PipelineCoreResourceKF | undefined>((selection) =>
              runs.find(({ id }) => id === selection),
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
          data={filteredRuns}
          columns={pipelineRunColumns}
          enablePagination
          emptyTableView={<EmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
          toolbarContent={toolbarContent}
          rowRenderer={(run) => (
            <PipelineRunTableRow
              key={run.id}
              isChecked={isSelected(run.id)}
              onToggleCheck={() => toggleSelection(run.id)}
              onDelete={() => setDeleteResources([run])}
              run={run}
              getJobInformation={getJobInformation}
            />
          )}
          variant={TableVariant.compact}
        />
      ) : (
        <ExperimentsTable
          data={filteredRuns}
          columns={pipelineRunExperimentColumns}
          enablePagination
          emptyTableView={<EmptyTableView onClearFilters={toolbarProps.onClearFilters} />}
          toolbarContent={toolbarContent}
          onDeleteRun={(run) => setDeleteResources([run])}
        />
      )}
      <DeletePipelineCoreResourceModal
        toDeleteResources={deleteResources}
        type="triggered run"
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

export default PipelineRunTable;
