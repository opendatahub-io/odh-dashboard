import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
  BreadcrumbItem,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { usePipelineActiveRunsTable } from '#~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { CompareRunsSearchParam, PathProps } from '#~/concepts/pipelines/content/types';
import { compareRunsRoute, createRunRoute } from '#~/routes/pipelines/runs';
import { experimentRunsRoute } from '#~/routes/pipelines/experiments';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { EmptyRunsState } from '#~/concepts/pipelines/content/tables/pipelineRun/EmptyRunsState';
import PipelineContextBreadcrumb from '#~/concepts/pipelines/content/PipelineContextBreadcrumb';
import { ManageRunsTable } from './ManageRunsTable';

const ManageRunsPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const [searchParams] = useSearchParams();
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable({ experimentId: experiment?.experiment_id });
  const selectedRunIds = searchParams.get(CompareRunsSearchParam.RUNS)?.split(',') ?? [];

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading runs"
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
      <EmptyRunsState
        createRunRoute={createRunRoute(namespace, experiment?.experiment_id)}
        dataTestId="runs-empty-state"
      />
    );
  }

  return (
    <ApplicationsPage
      title="Manage runs"
      loaded
      empty={!runs}
      breadcrumb={
        <PipelineContextBreadcrumb dataTestId="manage-runs-page-breadcrumb">
          {breadcrumbPath}
          {experiment ? (
            <BreadcrumbItem key="experiment">
              {experiment.display_name ? (
                <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
                  <Truncate content={experiment.display_name} />
                </Link>
              ) : (
                'Loading...'
              )}
            </BreadcrumbItem>
          ) : null}
          <BreadcrumbItem key="compare-runs">
            <Link to={compareRunsRoute(namespace, selectedRunIds, experiment?.experiment_id)}>
              Compare runs
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem key="manage-runs">Manage runs</BreadcrumbItem>
        </PipelineContextBreadcrumb>
      }
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <ManageRunsTable
        runs={runs}
        selectedRunIds={selectedRunIds}
        loading={!loaded}
        totalSize={totalSize}
        {...tableProps}
      />
    </ApplicationsPage>
  );
};

export default ManageRunsPage;
