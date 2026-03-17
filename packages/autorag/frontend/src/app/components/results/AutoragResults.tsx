import React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';
import type { PipelineRun } from '~/app/types';
import type { RunDetailsKF } from '~/app/types/pipeline';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
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
      <StackItem>
        <Title headingLevel="h2">{pipelineRun?.display_name} configurations</Title>
      </StackItem>
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
