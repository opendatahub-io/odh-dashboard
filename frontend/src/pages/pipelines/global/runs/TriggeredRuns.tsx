import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import CreateRunEmptyState from '~/pages/pipelines/global/runs/CreateRunEmptyState';
import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import usePipelineRuns from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';

type TriggeredRunsProps = {
  experiments: ExperimentKF[];
};

const TriggeredRuns: React.FC<TriggeredRunsProps> = ({ experiments }) => {
  const [runs, loaded, error] = usePipelineRuns();

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title size="lg" headingLevel="h2">
            There was an issue loading runs
          </Title>
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (runs.length === 0) {
    return (
      <CreateRunEmptyState
        title="No triggered runs yet"
        description="To get started, create run. Triggered and completed runs will be available here."
      />
    );
  }

  return <PipelineRunTable runs={runs} experiments={experiments} />;
};

export default TriggeredRuns;
