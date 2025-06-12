import React from 'react';
import { Split, SplitItem } from '@patternfly/react-core';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import PipelinesTableRowTime from '#~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import { usePipelineRunsByExperiment } from '#~/concepts/pipelines/apiHooks/usePipelineRuns';
import { RunStatus } from '#~/concepts/pipelines/content/tables/renderUtils';

type ExperimentUtil<P = Record<string, unknown>> = React.FC<{ experiment: ExperimentKF } & P>;

export const ExperimentCreated: ExperimentUtil = ({ experiment }) => {
  const createdDate = new Date(experiment.created_at);
  return <PipelinesTableRowTime date={createdDate} />;
};

export const LastExperimentRunsStarted: ExperimentUtil = ({ experiment }) => {
  const lastRunCreatedAt = experiment.last_run_created_at;

  // Check if last_run_created_at is not set or has a default invalid date
  if (!lastRunCreatedAt || lastRunCreatedAt === '1970-01-01T00:00:00Z') {
    return '-';
  }

  const lastRunStarted = new Date(lastRunCreatedAt);
  return Number.isNaN(lastRunStarted) ? '-' : <PipelinesTableRowTime date={lastRunStarted} />;
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
          <RunStatus run={run} hasNoLabel />
        </SplitItem>
      ))}
    </Split>
  );
};
