import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import { usePipelineActiveRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { createRunRoute } from '~/routes';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ActiveRuns: React.FC = () => {
  const navigate = useNavigate();
  const { namespace, experimentId, pipelineVersionId, pipelineId } = useParams();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable({ experimentId, pipelineVersionId });
  const isExperimentArchived = useContextExperimentArchived();

  if (isExperimentArchived) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={CubesIcon}
          titleText="Experiment archived"
          data-testid="experiment-archived-empty-state"
        >
          <EmptyStateBody>
            When an experiment is archived, its runs are moved to the {PipelineRunTabTitle.ARCHIVED}{' '}
            tab.
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading active runs"
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
        titleText="No runs"
        data-testid="active-runs-empty-state"
      >
        <EmptyStateBody>
          To get started, create a run. Alternatively, go to the{' '}
          <b>{PipelineRunTabTitle.SCHEDULES}</b> tab and create a schedule to execute recurring
          runs.
        </EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              data-testid="create-run-button"
              variant="primary"
              onClick={() =>
                navigate(createRunRoute(namespace, experimentId, pipelineId, pipelineVersionId))
              }
            >
              Create run
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <PipelineRunTable
      runs={runs}
      loading={!loaded}
      totalSize={totalSize}
      runType={PipelineRunType.ACTIVE}
      {...tableProps}
    />
  );
};
