import { Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
import type { PipelineRun } from '~/app/types';
import type { RunDetailsKF } from '~/app/types/pipeline';
import './AutoragResults.scss';

type AutoragResultsProps = {
  pipelineRun?: PipelineRun;
};

function AutoragResults({ pipelineRun }: AutoragResultsProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  return (
    <Stack hasGutter>
      <StackItem isFilled>
        <PipelineTopology
          nodes={nodes}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          className="autorag-topology-container"
        />
      </StackItem>
    </Stack>
  );
}

export default AutoragResults;
