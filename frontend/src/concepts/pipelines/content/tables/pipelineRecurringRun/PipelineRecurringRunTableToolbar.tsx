import * as React from 'react';
import { TextInput, ToolbarItem } from '@patternfly/react-core';
import PipelineFilterBar from '#~/concepts/pipelines/content/tables/PipelineFilterBar';
import { FilterOptions } from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import CreateScheduleButton from '#~/pages/pipelines/global/runs/CreateScheduleButton';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted as useIsExperimentArchived,
} from '#~/pages/pipelines/global/experiments/ExperimentContext';
import {
  ExperimentFilterSelector,
  PipelineVersionFilterSelector,
} from '#~/concepts/pipelines/content/pipelineSelector/CustomPipelineRunToolbarSelect';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate'
>;

interface PipelineRecurringRunTableToolbarProps extends FilterProps {
  dropdownActions: React.ReactNode;
}

const PipelineRecurringRunTableToolbar: React.FC<PipelineRecurringRunTableToolbarProps> = ({
  dropdownActions,
  ...toolbarProps
}) => {
  const { experiments } = React.useContext(PipelineRunExperimentsContext);
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const { isExperimentArchived } = useIsExperimentArchived();
  const { experiment } = React.useContext(ExperimentContext);
  const options = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Schedule',
      ...(!experiment && {
        [FilterOptions.EXPERIMENT]: 'Experiment',
      }),
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
    }),
    [experiment],
  );
  return (
    <PipelineFilterBar<keyof typeof options>
      {...toolbarProps}
      filterOptions={options}
      filterOptionRenders={{
        [FilterOptions.NAME]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a schedule name"
            placeholder="Search..."
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [FilterOptions.EXPERIMENT]: ({ onChange, label }) => (
          <ExperimentFilterSelector
            resources={experiments}
            selection={label}
            onSelect={(e) => onChange(e.experiment_id, e.display_name)}
          />
        ),
        [FilterOptions.PIPELINE_VERSION]: ({ onChange, label }) => (
          <PipelineVersionFilterSelector
            resources={versions}
            selection={label}
            onSelect={(v) => onChange(v.pipeline_version_id, v.display_name)}
          />
        ),
      }}
    >
      {!isExperimentArchived && (
        <ToolbarItem>
          <CreateScheduleButton />
        </ToolbarItem>
      )}
      <ToolbarItem data-testid="recurring-run-table-toolbar-item">{dropdownActions}</ToolbarItem>
    </PipelineFilterBar>
  );
};

export default PipelineRecurringRunTableToolbar;
