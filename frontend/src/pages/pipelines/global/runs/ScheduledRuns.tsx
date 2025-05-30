import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import CreateScheduleButton from '#~/pages/pipelines/global/runs/CreateScheduleButton';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted as useIsExperimentArchived,
} from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { usePipelineRecurringRunsTable } from '#~/concepts/pipelines/content/tables/pipelineRecurringRun/usePipelineRecurringRunTable';
import PipelineRecurringRunTable from '#~/concepts/pipelines/content/tables/pipelineRecurringRun/PipelineRecurringRunTable';

const ScheduledRuns: React.FC = () => {
  const { experiment } = React.useContext(ExperimentContext);
  const [
    [{ items: recurringRuns, totalSize }, loaded, error, refresh],
    { initialLoaded, ...tableProps },
  ] = usePipelineRecurringRunsTable({ experimentId: experiment?.experiment_id });
  const { isExperimentArchived } = useIsExperimentArchived();

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading schedules"
        >
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
      <EmptyState
        headingLevel="h2"
        icon={PlusCircleIcon}
        titleText="No schedules"
        data-testid="schedules-empty-state"
      >
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
      refresh={refresh}
      recurringRuns={recurringRuns}
      loading={!loaded}
      totalSize={totalSize}
      {...tableProps}
    />
  );
};

export default ScheduledRuns;
