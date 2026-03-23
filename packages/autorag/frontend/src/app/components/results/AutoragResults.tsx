import { Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import AutoragLeaderboard from './AutoragLeaderboard';
import './AutoragResults.scss';

function AutoragResults(): React.JSX.Element {
  const { pipelineRun } = useAutoragResultsContext();
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  return (
    <Stack hasGutter>
      <StackItem>
        <PipelineTopology
          nodes={nodes}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          className="autorag-topology-container"
        />
      </StackItem>
      <StackItem>
        <AutoragLeaderboard />
      </StackItem>
    </Stack>
  );
}

export default AutoragResults;
