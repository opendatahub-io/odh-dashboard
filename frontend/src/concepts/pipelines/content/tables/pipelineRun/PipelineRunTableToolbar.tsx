import * as React from 'react';
import { TextInput, ToolbarItem } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import ExperimentSearchInput from '~/concepts/pipelines/content/tables/ExperimentSearchInput';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import DashboardDatePicker from '~/components/DashboardDatePicker';
import PipelineVersionSelect from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineVersionSelect';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

interface PipelineRunTableToolbarProps extends FilterProps {
  actions?: React.ReactNode[];
  filterOptions?: React.ComponentProps<typeof PipelineFilterBar>['filterOptions'];
}

const PipelineRunTableToolbar: React.FC<PipelineRunTableToolbarProps> = ({
  actions,
  filterOptions,
  ...toolbarProps
}) => {
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const { experimentId } = useParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: unspecifiedState, ...statusRuntimeStates } =
    runtimeStateLabels;
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  const defaultFilterOptions = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Run',
      ...(!(isExperimentsAvailable && experimentId) && {
        [FilterOptions.EXPERIMENT]: 'Experiment',
      }),
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
      [FilterOptions.CREATED_AT]: 'Started',
      [FilterOptions.STATUS]: 'Status',
    }),
    [experimentId, isExperimentsAvailable],
  );

  return (
    <PipelineFilterBar
      {...toolbarProps}
      filterOptions={filterOptions || defaultFilterOptions}
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
      {actions?.map((action, index) => (
        <ToolbarItem key={index}>{action}</ToolbarItem>
      ))}
    </PipelineFilterBar>
  );
};

export default PipelineRunTableToolbar;
