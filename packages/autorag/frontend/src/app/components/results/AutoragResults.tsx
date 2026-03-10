import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import type { PipelineRun } from '~/app/types';
import type { RunDetailsKF } from '~/app/types/pipeline';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';

type AutoragResultsProps = {
  pipelineRun?: PipelineRun;
};

function AutoragResults({ pipelineRun }: AutoragResultsProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;
  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  if (!pipelineRun) {
    return <div />;
  }

  return (
    <Stack hasGutter>
      <StackItem isFilled>
        <div style={{ height: 350, position: 'relative' }}>
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </StackItem>
    </Stack>
  );
}

export default AutoragResults;
