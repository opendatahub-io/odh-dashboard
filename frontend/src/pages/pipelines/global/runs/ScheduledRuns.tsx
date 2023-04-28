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
import usePipelineRunJobs from '~/concepts/pipelines/apiHooks/usePipelineRunJobs';
import PipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTable';

const ScheduledRuns: React.FC = () => {
  const [jobs, loaded, error] = usePipelineRunJobs();

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

  if (jobs.length === 0) {
    return (
      <CreateRunEmptyState
        title="No scheduled runs yet"
        description="To get started, create and schedule a recurring run."
      />
    );
  }

  return <PipelineRunJobTable jobs={jobs} />;
};

export default ScheduledRuns;
