import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { experimentsBaseRoute, experimentsManageCompareRunsRoute } from '~/routes';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import PipelineRunTableToolbarBase, {
  FilterProps,
} from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbarBase';

const CompareRunTableToolbar: React.FC<FilterProps> = ({ ...toolbarProps }) => {
  const { runs } = useCompareRuns();
  const navigate = useNavigate();
  const { namespace, experimentId } = useParams();

  const options = React.useMemo(
    () => ({
      [FilterOptions.NAME]: 'Run',
      [FilterOptions.EXPERIMENT]: 'Experiment',
      [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
      [FilterOptions.CREATED_AT]: 'Created after',
      [FilterOptions.STATUS]: 'Status',
    }),
    [],
  );

  if (!namespace || !experimentId) {
    navigate(experimentsBaseRoute(namespace));
    return null;
  }

  return (
    <PipelineRunTableToolbarBase {...toolbarProps} filterOptions={options}>
      <ToolbarItem>
        <Button
          variant="primary"
          onClick={() =>
            navigate(
              experimentsManageCompareRunsRoute(
                namespace,
                experimentId,
                runs.map((r) => r.run_id),
              ),
            )
          }
        >
          Manage runs
        </Button>
      </ToolbarItem>
    </PipelineRunTableToolbarBase>
  );
};

export default CompareRunTableToolbar;
