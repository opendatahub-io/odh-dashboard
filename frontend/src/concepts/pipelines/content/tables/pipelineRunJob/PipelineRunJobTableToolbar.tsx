import * as React from 'react';
import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';
import DateRange from '~/components/dateRange/DateRange';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import ExperimentToggleGroup, {
  ToggleGroupOption,
} from '~/concepts/pipelines/content/tables/ExperimentToggleGroup';
import ManageExperimentModal from '~/concepts/pipelines/content/experiment/ManageExperimentModal';

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
} & Omit<React.ComponentProps<typeof RunTableToolbarActions>, 'onCreateExperiment'> &
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
  const [createExperiment, setCreateExperiment] = React.useState(false);

  return (
    <>
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
        {toggleGroup === ToggleGroupOption.RUN_VIEW ? (
          <>
            <ToolbarItem>
              <Button
                variant="secondary"
                onClick={() => navigate(`/pipelineRuns/${namespace}/pipelineRun/create`)}
              >
                Create run
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <RunTableToolbarActions
                onCreateExperiment={() => setCreateExperiment(true)}
                deleteAllEnabled={deleteAllEnabled}
                onDeleteAll={onDeleteAll}
              />
            </ToolbarItem>
          </>
        ) : (
          <></>
        )}
        {toggleGroup === ToggleGroupOption.EXPERIMENT_VIEW ? (
          <ToolbarItem>
            <Button variant="secondary" onClick={() => setCreateExperiment(true)}>
              Create experiment
            </Button>
          </ToolbarItem>
        ) : (
          <></>
        )}
      </PipelineFilterBar>
      <ManageExperimentModal isOpen={createExperiment} onClose={() => setCreateExperiment(false)} />
    </>
  );
};

export default PipelineRunJobTableToolbar;
