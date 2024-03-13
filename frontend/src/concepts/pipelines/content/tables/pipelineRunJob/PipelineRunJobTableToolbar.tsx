import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, TextInput, ToolbarItem } from '@patternfly/react-core';

import PipelineFilterBar from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import PipelineVersionSelect from '~/concepts/pipelines/content/pipelineSelector/CustomPipelineVersionSelect';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { routePipelineRunCreateNamespace } from '~/routes';

const options = {
  [FilterOptions.NAME]: 'Name',
  [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
};

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

interface PipelineRunJobTableToolbarProps extends FilterProps {
  dropdownActions: React.ReactNode;
}

const PipelineRunJobTableToolbar: React.FC<PipelineRunJobTableToolbarProps> = ({
  dropdownActions,
  ...toolbarProps
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const { versions } = React.useContext(PipelineRunVersionsContext);

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
      <ToolbarItem>
        <Button
          variant="primary"
          onClick={() =>
            navigate({
              pathname: routePipelineRunCreateNamespace(namespace),
              search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Scheduled}`,
            })
          }
        >
          Schedule run
        </Button>
      </ToolbarItem>
      <ToolbarItem data-testid="job-table-toolbar-item">{dropdownActions}</ToolbarItem>
    </PipelineFilterBar>
  );
};

export default PipelineRunJobTableToolbar;
