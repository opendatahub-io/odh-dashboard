import * as React from 'react';
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
import { usePipelineArchivedRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { ExperimentContext } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunTabTitle, PipelineRunType } from './types';

export const ArchivedRuns: React.FC = () => {
  const { experiment } = React.useContext(ExperimentContext);

  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineArchivedRunsTable({ experimentId: experiment?.experiment_id });

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading archived runs"
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
      <EmptyState data-testid="archived-runs-empty-state">
        <EmptyStateHeader
          titleText="No archived runs"
          icon={<EmptyStateIcon icon={CubesIcon} />}
          headingLevel="h2"
        />

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
