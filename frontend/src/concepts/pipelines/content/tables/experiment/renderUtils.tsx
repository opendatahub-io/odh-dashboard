import React from 'react';
import { Split, SplitItem } from '@patternfly/react-core';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import { usePipelineRunsByExperiment } from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { RunStatus } from '~/concepts/pipelines/content/tables/renderUtils';

type ExperimentUtil<P = Record<string, unknown>> = React.FC<{ experiment: ExperimentKFv2 } & P>;

export const ExperimentCreated: ExperimentUtil = ({ experiment }) => {
  const createdDate = new Date(experiment.created_at);
  return <PipelinesTableRowTime date={createdDate} />;
};

export const LastExperimentRuns: ExperimentUtil = ({ experiment }) => {
  const [runs] = usePipelineRunsByExperiment(experiment.experiment_id, {
    sortDirection: 'desc',
    sortField: 'created_at',
  });

  if (runs.items.length === 0) {
    return <>-</>;
  }

  const last5runs = runs.items.slice(0, 5);

  return (
    <Split hasGutter>
      {last5runs.map((run) => (
        <SplitItem key={run.run_id}>
          <RunStatus run={run} justIcon />
        </SplitItem>
      ))}
    </Split>
  );
};
