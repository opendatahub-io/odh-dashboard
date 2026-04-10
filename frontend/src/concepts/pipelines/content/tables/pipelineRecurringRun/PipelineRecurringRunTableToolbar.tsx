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
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import MlflowExperimentSelector from '#~/concepts/mlflow/MlflowExperimentSelector';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

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
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const { experiments } = React.useContext(PipelineRunExperimentsContext);
  const { isExperimentArchived } = useIsExperimentArchived();
  const { experiment } = React.useContext(ExperimentContext);
  const { status: isMlflowAvailable } = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES);
  const { namespace } = usePipelinesAPI();
  const options = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Schedule',
      ...(!experiment && {
        [FilterOptions.RUN_GROUP]: 'Run group',
      }),
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
      ...(isMlflowAvailable && {
        [FilterOptions.MLFLOW_EXPERIMENT]: 'MLflow experiment',
      }),
    }),
    [experiment, isMlflowAvailable],
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
        [FilterOptions.RUN_GROUP]: ({ onChange, value }) => (
          <ExperimentFilterSelector
            resources={experiments}
            selection={value}
            onSelect={(selected) => onChange(selected.display_name)}
          />
        ),
        [FilterOptions.MLFLOW_EXPERIMENT]: ({ onChange, value }) => (
          <MlflowExperimentSelector
            workspace={namespace}
            selection={value}
            onSelect={(mlflowExperiment) => onChange(mlflowExperiment.name)}
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
