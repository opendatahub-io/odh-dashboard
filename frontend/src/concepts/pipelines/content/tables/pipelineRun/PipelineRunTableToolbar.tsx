import * as React from 'react';
import { Button, DatePicker, TextInput, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { PipelineRunStatusesKF, PipelineRunStatusUnknown } from '~/concepts/pipelines/kfTypes';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

export enum FilterOptions {
  NAME = 'Name',
  EXPERIMENT = 'Experiment',
  PIPELINE = 'Pipeline',
  STARTED = 'Started',
  STATUS = 'Status',
}

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

  return (
    <PipelineFilterBar
      {...toolbarProps}
      filterOptions={FilterOptions}
      filterOptionRenders={{
        [FilterOptions.NAME]: (props) => (
          <TextInput
            {...props}
            aria-label="Search for a scheduled run name"
            placeholder="Scheduled run name"
          />
        ),
        [FilterOptions.EXPERIMENT]: (props) => (
          <TextInput
            {...props}
            aria-label="Search for a experiment name"
            placeholder="Experiment name"
          />
        ),
        [FilterOptions.PIPELINE]: (props) => (
          <TextInput
            {...props}
            aria-label="Search for a pipeline name"
            placeholder="Pipeline name"
          />
        ),
        [FilterOptions.STARTED]: ({ onChange, ...props }) => (
          <DatePicker
            {...props}
            aria-label="Select a start date"
            onChange={(event, value) => onChange(value)}
          />
        ),
        [FilterOptions.STATUS]: (props) => (
          <SimpleDropdownSelect
            {...props}
            aria-label="Select a status"
            options={[...Object.values(PipelineRunStatusesKF), PipelineRunStatusUnknown].map(
              (value) => ({
                key: value,
                label: value,
              }),
            )}
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
