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
import CreateScheduleButton from '~/pages/pipelines/global/runs/CreateScheduleButton';
import { useContextExperimentArchived as useIsExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { usePipelineRecurringRunsTable } from '~/concepts/pipelines/content/tables/pipelineRecurringRun/usePipelineRecurringRunTable';
import PipelineRecurringRunTable from '~/concepts/pipelines/content/tables/pipelineRecurringRun/PipelineRecurringRunTable';

const ScheduledRuns: React.FC = () => {
  const { experimentId, pipelineVersionId } = useParams();
  const [[{ items: recurringRuns, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineRecurringRunsTable({ experimentId, pipelineVersionId });
  const isExperimentArchived = useIsExperimentArchived();

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
          Schedules dictate when and how many times a run is executed.{' '}
          {!isExperimentArchived && 'To get started, create a schedule.'}
        </EmptyStateBody>

        {!isExperimentArchived && (
          <EmptyStateFooter>
            <EmptyStateActions>
              <CreateScheduleButton />
            </EmptyStateActions>
          </EmptyStateFooter>
        )}
      </EmptyState>
    );
  }

  return (
    <PipelineRecurringRunTable
      recurringRuns={recurringRuns}
      loading={!loaded}
      totalSize={totalSize}
      {...tableProps}
    />
  );
};

export default ScheduledRuns;
