import React from 'react';
import { useParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';

import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import { usePipelineActiveRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { createRunRoute } from '~/routes';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { EmptyRunsState } from '~/concepts/pipelines/content/tables/pipelineRun/EmptyRunsState';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ActiveRuns: React.FC = () => {
  const { namespace, experimentId, pipelineVersionId, pipelineId } = useParams();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable({ experimentId, pipelineVersionId });
  const isExperimentArchived = useContextExperimentArchived();

  if (isExperimentArchived) {
    return (
      <Bullseye>
        <EmptyState data-testid="experiment-archived-empty-state">
          <EmptyStateHeader
            titleText="Experiment archived"
            icon={<EmptyStateIcon icon={CubesIcon} />}
            headingLevel="h2"
          />
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
      <EmptyRunsState
        createRunRoute={createRunRoute(namespace, experimentId, pipelineId, pipelineVersionId)}
        dataTestId="active-runs-empty-state"
      />
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
