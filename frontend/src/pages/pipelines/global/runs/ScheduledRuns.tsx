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
import PipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTable';
import usePipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobTable';

const ScheduledRuns: React.FC = () => {
  const [[{ items: jobs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineRunJobTable();

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

  if (!loaded && !initialLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loaded && totalSize === 0 && !tableProps.filter) {
    return (
      <CreateRunEmptyState
        title="No scheduled runs yet"
        description="To get started, create and schedule a recurring run."
      />
    );
  }

  return (
    <PipelineRunJobTable jobs={jobs} loading={!loaded} totalSize={totalSize} {...tableProps} />
  );
};

export default ScheduledRuns;
