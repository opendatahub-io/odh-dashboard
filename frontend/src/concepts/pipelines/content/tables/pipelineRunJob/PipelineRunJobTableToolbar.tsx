import * as React from 'react';
import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';
import DateRange from '~/components/dateRange/DateRange';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

export enum FilterOptions {
  NAME = 'Name',
  EXPERIMENT = 'Experiment',
  PIPELINE = 'Pipeline',
  SCHEDULED = 'Scheduled',
  STATUS = 'Status',
}

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

type PipelineRunJobTableToolbarProps = React.ComponentProps<typeof RunTableToolbarActions> &
  FilterProps;

const PipelineRunJobTableToolbar: React.FC<PipelineRunJobTableToolbarProps> = ({
  deleteAllEnabled,
  onDeleteAll,
  ...toolbarProps
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  return (
    <PipelineFilterBar
      {...toolbarProps}
      filterOptions={FilterOptions}
      filterOptionRenders={{
        [FilterOptions.NAME]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a scheduled run name"
            placeholder="Scheduled run name"
            onChange={(event, value) => onChange(value)}
          />
        ),
        [FilterOptions.EXPERIMENT]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a experiment name"
            placeholder="Experiment name"
            onChange={(event, value) => onChange(value)}
          />
        ),
        [FilterOptions.PIPELINE]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search for a pipeline name"
            placeholder="Pipeline name"
            onChange={(event, value) => onChange(value)}
          />
        ),
        [FilterOptions.SCHEDULED]: (props) => (
          <DateRange {...props} aria-label="Select a scheduled date range" />
        ),
        [FilterOptions.STATUS]: (props) => (
          <SimpleDropdownSelect
            {...props}
            options={[
              { key: 'Enabled', label: 'Enabled' },
              { key: 'Disabled', label: 'Disabled' },
            ]}
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

export default PipelineRunJobTableToolbar;
