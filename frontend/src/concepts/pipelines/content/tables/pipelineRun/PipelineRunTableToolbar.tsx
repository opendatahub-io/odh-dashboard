import * as React from 'react';
import { TextInput, ToolbarItem } from '@patternfly/react-core';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import ExperimentSearchInput from '~/concepts/pipelines/content/tables/ExperimentSearchInput';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import DashboardDatePicker from '~/components/DashboardDatePicker';
import PipelineVersionSelect from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineVersionSelect';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const options = {
  [FilterOptions.NAME]: 'Name',
  [FilterOptions.EXPERIMENT]: 'Experiment',
  [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
  [FilterOptions.CREATED_AT]: 'Started',
  [FilterOptions.STATUS]: 'Status',
};

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

interface PipelineRunTableToolbarProps extends FilterProps {
  primaryAction: React.ReactNode;
  dropdownActions: React.ReactNode;
}

const PipelineRunTableToolbar: React.FC<PipelineRunTableToolbarProps> = ({
  primaryAction,
  dropdownActions,
  ...toolbarProps
}) => {
  const { versions } = React.useContext(PipelineRunVersionsContext);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: unspecifiedState, ...statusRuntimeStates } =
    runtimeStateLabels;

  return (
    <PipelineFilterBar<keyof typeof options>
      {...toolbarProps}
      filterOptions={options}
      filterOptionRenders={{
        [FilterOptions.NAME]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a run name"
            placeholder="Search..."
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [FilterOptions.EXPERIMENT]: ({ onChange, value, label }) => (
          <ExperimentSearchInput
            onChange={(data) => onChange(data?.value, data?.label)}
            selected={value && label ? { value, label } : undefined}
          />
        ),
        [FilterOptions.PIPELINE_VERSION]: ({ onChange, label }) => (
          <PipelineVersionSelect
            versions={versions}
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
          <SimpleDropdownSelect
            {...props}
            value={value ?? ''}
            aria-label="Select a status"
            options={Object.values(statusRuntimeStates).map((v) => ({
              key: v,
              label: v,
            }))}
            onChange={(v) => onChange(v)}
            data-testid="runtime-status-dropdown"
          />
        ),
      }}
    >
      <ToolbarItem>{primaryAction}</ToolbarItem>
      <ToolbarItem>{dropdownActions}</ToolbarItem>
    </PipelineFilterBar>
  );
};

export default PipelineRunTableToolbar;
