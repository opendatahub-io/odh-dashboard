import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import { usePipelineArchivedRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ArchivedRuns: React.FC = () => {
  const { experimentId, pipelineVersionId } = useParams();

  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineArchivedRunsTable({ experimentId, pipelineVersionId });

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading archived runs"
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
        icon={CubesIcon}
        titleText="No archived runs"
        data-testid="archived-runs-empty-state"
      >
        <EmptyStateBody>
          Archive a run to remove it from the <b>{PipelineRunTabTitle.ACTIVE}</b> tab. Archived runs
          can be restored later, or deleted.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <PipelineRunTable
      runs={runs}
      loading={!loaded}
      totalSize={totalSize}
      runType={PipelineRunType.ARCHIVED}
      {...tableProps}
    />
  );
};
