import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import CreateRunEmptyState from '~/pages/pipelines/global/runs/CreateRunEmptyState';
import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import usePipelineRuns from '~/concepts/pipelines/apiHooks/usePipelineRuns';

const TriggeredRuns: React.FC = () => {
  const [runs, loaded, error] = usePipelineRuns();

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading runs"
            icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
            headingLevel="h2"
          />
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

  return <PipelineRunTable runs={runs} />;
};

export default TriggeredRuns;
