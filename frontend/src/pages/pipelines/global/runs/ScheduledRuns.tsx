import React from 'react';
import { useParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import PipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTable';
import { usePipelineScheduledRunsTable } from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobTable';
import CreateScheduleButton from '~/pages/pipelines/global/runs/CreateScheduleButton';

const ScheduledRuns: React.FC = () => {
  const { experimentId, pipelineVersionId } = useParams();

  const [[{ items: jobs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineScheduledRunsTable({ experimentId, pipelineVersionId });

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading schedules"
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
      <EmptyState data-testid="schedules-empty-state">
        <EmptyStateHeader
          titleText="No schedules"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
          headingLevel="h2"
        />

        <EmptyStateBody>
          Schedules dictate when and how many times a run is executed. To get started, create a
          schedule.
        </EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <CreateScheduleButton />
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <PipelineRunJobTable jobs={jobs} loading={!loaded} totalSize={totalSize} {...tableProps} />
  );
};

export default ScheduledRuns;
