import * as React from 'react';
import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';
import DateRange from '~/components/dateRange/DateRange';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import ExperimentToggleGroup from '~/concepts/pipelines/content/tables/ExperimentToggleGroup';

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

type ExperimentToggleGroupProps = React.ComponentProps<typeof ExperimentToggleGroup>;

type PipelineRunJobTableToolbarProps = {
  toggleGroup: ExperimentToggleGroupProps['selectedItem'];
  onToggleGroupChange: ExperimentToggleGroupProps['onSelection'];
} & React.ComponentProps<typeof RunTableToolbarActions> &
  FilterProps;

const PipelineRunJobTableToolbar: React.FC<PipelineRunJobTableToolbarProps> = ({
  deleteAllEnabled,
  onDeleteAll,
  toggleGroup,
  onToggleGroupChange,
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
        <ExperimentToggleGroup selectedItem={toggleGroup} onSelection={onToggleGroupChange} />
      </ToolbarItem>
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
