import { Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoMLTaskTopology } from '~/app/topology/useAutoMLTaskTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import AutomlLeaderboard from './AutomlLeaderboard';
import './AutomlResults.scss';

function AutomlResults(): React.JSX.Element {
  const { pipelineRun } = useAutomlResultsContext();
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoMLTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  return (
    <Stack hasGutter>
      <StackItem>
        <PipelineTopology
          nodes={nodes}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          className="automl-topology-container"
        />
      </StackItem>
      <StackItem>
        <AutomlLeaderboard />
      </StackItem>
    </Stack>
  );
}

export default AutomlResults;
