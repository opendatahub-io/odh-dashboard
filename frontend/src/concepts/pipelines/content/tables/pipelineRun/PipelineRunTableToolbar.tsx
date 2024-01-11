import * as React from 'react';
import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import ExperimentSearchInput from '~/concepts/pipelines/content/tables/ExperimentSearchInput';
import { PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';
import DashboardDatePicker from '~/components/DashboardDatePicker';
import { useAllPipelineVersions } from '~/concepts/pipelines/apiHooks/useAllPipelineVersions';
import PipelineVersionSelect from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineVersionSelect';

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

type PipelineRunJobTableToolbarProps = React.ComponentProps<typeof RunTableToolbarActions> &
  FilterProps;

const PipelineRunTableToolbar: React.FC<PipelineRunJobTableToolbarProps> = ({
  deleteAllEnabled,
  onDeleteAll,
  ...toolbarProps
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [{ items: pipelineVersions }] = useAllPipelineVersions();

  return (
    <PipelineFilterBar<keyof typeof options>
      {...toolbarProps}
      filterOptions={options}
      filterOptionRenders={{
        [FilterOptions.NAME]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a triggered run name"
            placeholder="Triggered run name"
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
            versions={pipelineVersions}
            selection={label}
            onSelect={(version) => onChange(version.id, version.name)}
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
            options={Object.values(PipelineRunStatusesKF).map((value) => ({
              key: value,
              label: value,
            }))}
            onChange={(value) => {
              onChange(value);
            }}
          />
        ),
      }}
    >
      <ToolbarItem>
        <Button
          variant="secondary"
          onClick={() => navigate(`/pipelineRuns/${namespace}/pipelineRun/create`)}
        >
          Create run
        </Button>
      </ToolbarItem>
      <ToolbarItem>
        <RunTableToolbarActions deleteAllEnabled={deleteAllEnabled} onDeleteAll={onDeleteAll} />
      </ToolbarItem>
    </PipelineFilterBar>
  );
};

export default PipelineRunTableToolbar;
