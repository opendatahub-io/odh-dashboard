import { Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoMLTaskTopology } from '~/app/topology/useAutoMLTaskTopology';
import type { PipelineRun } from '~/app/types';
import type { RunDetailsKF } from '~/app/types/pipeline';
import './AutomlResults.scss';

type AutomlResultsProps = {
  pipelineRun?: PipelineRun;
};

function AutomlResults({ pipelineRun }: AutomlResultsProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoMLTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  return (
    <Stack hasGutter>
      <StackItem isFilled>
        <PipelineTopology
          nodes={nodes}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          className="automl-topology-container"
        />
      </StackItem>
    </Stack>
  );
}

export default AutomlResults;
