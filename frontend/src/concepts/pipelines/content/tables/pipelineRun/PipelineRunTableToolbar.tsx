import * as React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import PipelineRunTableToolbarBase, { FilterProps } from './PipelineRunTableToolbarBase';

interface PipelineRunTableToolbarProps extends FilterProps {
  actions?: React.ReactNode[];
  filterOptions?: React.ComponentProps<typeof PipelineRunTableToolbarBase>['filterOptions'];
}

const PipelineRunTableToolbar: React.FC<PipelineRunTableToolbarProps> = ({
  actions,
  filterOptions,
  ...toolbarProps
}) => {
  const { experimentId, pipelineVersionId } = useParams();

  const defaultFilterOptions = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Run',
      ...(!experimentId && {
        [FilterOptions.EXPERIMENT]: 'Experiment',
      }),
      ...(!pipelineVersionId && {
        [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
      }),
      [FilterOptions.CREATED_AT]: 'Created after',
      [FilterOptions.STATUS]: 'Status',
    }),
    [experimentId, pipelineVersionId],
  );

  return (
    <PipelineRunTableToolbarBase
      {...toolbarProps}
      filterOptions={filterOptions || defaultFilterOptions}
      actions={actions?.map((action, index) => (
        <ToolbarItem key={index}>{action}</ToolbarItem>
      ))}
    />
  );
};

export default PipelineRunTableToolbar;
