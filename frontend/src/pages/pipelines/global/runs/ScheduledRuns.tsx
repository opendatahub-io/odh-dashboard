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
import PipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTable';
import usePipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobTable';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';

const ScheduledRuns: React.FC = () => {
  // TODO, https://issues.redhat.com/browse/RHOAIENG-2273
  const [[{ totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineRunJobTable();
  const jobs: PipelineRunJobKF[] = [];

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
