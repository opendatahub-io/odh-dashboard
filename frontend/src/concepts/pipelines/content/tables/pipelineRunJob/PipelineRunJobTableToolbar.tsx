import * as React from 'react';
import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTableToolbarActions from '~/concepts/pipelines/content/tables/RunTableToolbarActions';

export enum FilterOptions {
  NAME = 'Name',
  EXPERIMENT = 'Experiment',
  PIPELINE = 'Pipeline',
  // TODO: how to filter on trigger? -- it's an "every x"
  // TRIGGER = 'Trigger',
  // TODO: how to filter on scheduled? -- it's a start(?) to end(?)
  // SCHEDULED = 'Scheduled',
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
}) => (
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
        <TextInput {...props} aria-label="Search for a pipeline name" placeholder="Pipeline name" />
      ),
      // [FilterOptions.TRIGGER]: ({ onChange, ...props }) => (
      //   <DatePicker
      //     aria-label="Select a trigger duration date"
      //     {...props}
      //     onChange={(event, value) => onChange(value)}
      //   />
      // ),
      // [FilterOptions.SCHEDULED]: ({ onChange, ...props }) => (
      //   <DatePicker
      //     aria-label="Select a scheduled date"
      //     {...props}
      //     onChange={(event, value) => onChange(value)}
      //   />
      // ),
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
        onClick={() => alert('should navigate to pipeline run creation page')}
      >
        Create run
      </Button>
    </ToolbarItem>
    <ToolbarItem>
      <RunTableToolbarActions deleteAllEnabled={deleteAllEnabled} onDeleteAll={onDeleteAll} />
    </ToolbarItem>
  </PipelineFilterBar>
);

export default PipelineRunJobTableToolbar;
