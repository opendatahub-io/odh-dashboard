import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import { usePipelineActiveRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { routePipelineRunCreateNamespace } from '~/routes';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ActiveRuns: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable();

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading active runs"
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
      <EmptyState data-testid="active-runs-empty-state">
        <EmptyStateHeader
          titleText="No active runs"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
          headingLevel="h2"
        />

        <EmptyStateBody>
          To get started, create a run. Alternatively, click the{' '}
          <b>{PipelineRunTabTitle.Schedules}</b> tab to create, manage, and execute schedules. A
          schedule is a job consisting of one or more recurring runs.
        </EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              onClick={() =>
                navigate({
                  pathname: routePipelineRunCreateNamespace(namespace),
                  search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Active}`,
                })
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
      runType={PipelineRunType.Active}
      {...tableProps}
    />
  );
};
