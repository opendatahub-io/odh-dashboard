import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
  Button,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import PipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTable';
import usePipelineRunJobTable from '~/concepts/pipelines/content/tables/pipelineRunJob/usePipelineRunJobTable';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { routePipelineRunCreateNamespace } from '~/routes';
import { PipelineRunType } from './types';

const ScheduledRuns: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const [[{ items: jobs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineRunJobTable();

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
            <Button
              variant="primary"
              onClick={() =>
                navigate({
                  pathname: routePipelineRunCreateNamespace(namespace),
                  search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Scheduled}`,
                })
              }
            >
              Schedule run
            </Button>
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
