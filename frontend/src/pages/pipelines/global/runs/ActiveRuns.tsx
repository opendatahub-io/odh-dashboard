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
import { createRunRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ActiveRuns: React.FC = () => {
  const navigate = useNavigate();
  const { namespace, experimentId } = useParams();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable({ experimentId });
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

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
          To get started, create a run. Alternatively, go to the{' '}
          <b>{PipelineRunTabTitle.Schedules}</b> tab and create a schedule to execute recurring
          runs.
        </EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              data-testid="create-run-button"
              variant="primary"
              onClick={() =>
                navigate({
                  pathname: createRunRoute(
                    namespace,
                    isExperimentsAvailable ? experimentId : undefined,
                  ),
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
