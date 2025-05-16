import * as React from 'react';
import { TextInput } from '@patternfly/react-core';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import DashboardDatePicker from '~/components/DashboardDatePicker';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { PipelineRunExperimentsContext } from '~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import {
  ExperimentFilterSelector,
  PipelineVersionFilterSelector,
} from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineRunToolbarSelect';

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate'
>;

interface PipelineRunTableToolbarBaseProps extends FilterProps {
  actions?: React.ReactNode[];
  filterOptions: React.ComponentProps<typeof PipelineFilterBar>['filterOptions'];
  children?: React.ReactNode;
}

const PipelineRunTableToolbarBase: React.FC<PipelineRunTableToolbarBaseProps> = ({
  actions,
  filterOptions,
  children,
  ...toolbarProps
}) => {
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const { experiments } = React.useContext(PipelineRunExperimentsContext);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: unspecifiedState,
    [RuntimeStateKF.PAUSED]: pausedState,
    [RuntimeStateKF.CANCELED]: cancelledState,
    ...statusRuntimeStates
  } = runtimeStateLabels;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <PipelineFilterBar
      {...toolbarProps}
      filterOptions={filterOptions}
      filterOptionRenders={{
        [FilterOptions.NAME]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            data-testid="search-for-run-name"
            aria-label="Search for a run name"
            placeholder="Search..."
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [FilterOptions.EXPERIMENT]: ({ onChange, label }) => (
          <ExperimentFilterSelector
            resources={experiments}
            selection={label}
            onSelect={(experiment) => onChange(experiment.experiment_id, experiment.display_name)}
          />
        ),
        [FilterOptions.PIPELINE_VERSION]: ({ onChange, label }) => (
          <PipelineVersionFilterSelector
            resources={versions}
            selection={label}
            onSelect={(version) => onChange(version.pipeline_version_id, version.display_name)}
          />
        ),
        [FilterOptions.CREATED_AT]: ({ onChange, ...props }) => (
          <DashboardDatePicker
            {...props}
            hideError
            aria-label="Select a start date"
            onChange={(_, value, date) => {
              if (date || !value) {
                onChange(value);
              }
            }}
          />
        ),
        [FilterOptions.STATUS]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            value={value}
            placeholder="Select a status"
            aria-label="Select a status"
            options={Object.values(statusRuntimeStates).map(
              (v): SimpleSelectOption => ({
                key: v,
                label: v,
              }),
            )}
            onChange={(v) => onChange(v)}
            dataTestId="runtime-status-dropdown"
            popperProps={{ maxWidth: undefined, appendTo: 'inline' }}
          />
        ),
      }}
    >
      {actions?.map((action, index) => (
        <React.Fragment key={index}>{action}</React.Fragment>
      ))}
      {children}
    </PipelineFilterBar>
  );
};

export default PipelineRunTableToolbarBase;
