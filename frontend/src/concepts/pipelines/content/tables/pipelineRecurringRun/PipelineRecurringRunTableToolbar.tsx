import * as React from 'react';
import { TextInput, ToolbarItem } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import PipelineVersionSelect from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineVersionSelect';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import CreateScheduleButton from '~/pages/pipelines/global/runs/CreateScheduleButton';
import { useContextExperimentArchived as useIsExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

interface PipelineRecurringRunTableToolbarProps extends FilterProps {
  dropdownActions: React.ReactNode;
}

const PipelineRecurringRunTableToolbar: React.FC<PipelineRecurringRunTableToolbarProps> = ({
  dropdownActions,
  ...toolbarProps
}) => {
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const isExperimentArchived = useIsExperimentArchived();
  const { pipelineVersionId } = useParams();

  const options = {
    [FilterOptions.NAME]: 'Schedule',
    [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
    ...(!pipelineVersionId && {
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
    }),
  };

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
        [FilterOptions.PIPELINE_VERSION]: ({ onChange, label }) => (
          <PipelineVersionSelect
            versions={versions}
            selection={label}
            onSelect={(version) => onChange(version.pipeline_version_id, version.display_name)}
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
