import * as React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { FilterOptions } from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
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
  const { experiment } = React.useContext(ExperimentContext);
  const { status: isMlflowAvailable } = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES);

  const defaultFilterOptions = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Run',
      ...(!experiment && {
        [FilterOptions.RUN_GROUP]: 'Run group',
      }),
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
      ...(isMlflowAvailable && {
        [FilterOptions.MLFLOW_EXPERIMENT]: 'MLflow experiment',
      }),
      [FilterOptions.CREATED_AT]: 'Created after',
      [FilterOptions.STATUS]: 'Status',
    }),
    [experiment, isMlflowAvailable],
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
