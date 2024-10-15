import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  EmptyStateHeader,
  Breadcrumb,
  BreadcrumbItem,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { usePipelineActiveRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { CompareRunsSearchParam } from '~/concepts/pipelines/content/types';
import {
  experimentRunsRoute,
  experimentsBaseRoute,
  experimentsCompareRunsRoute,
  experimentsCreateRunRoute,
} from '~/routes';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineFilter, {
  FilterOptions,
} from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { ExperimentContext } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { EmptyRunsState } from '~/concepts/pipelines/content/tables/pipelineRun/EmptyRunsState';
import { ManageRunsTable } from './ManageRunsTable';

interface ManageRunsPageInternalProps {
  experiment: ExperimentKFv2;
}

export const ManageRunsPageInternal: React.FC<ManageRunsPageInternalProps> = ({ experiment }) => {
  const [searchParams] = useSearchParams();
  const { namespace, project } = usePipelinesAPI();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable();
  const { onClearFilters, ...filterProps } = usePipelineFilter(tableProps.setFilter, {
    [FilterOptions.EXPERIMENT]: {
      label: experiment.display_name,
      value: experiment.experiment_id,
    },
  });
  const selectedRunIds = searchParams.get(CompareRunsSearchParam.RUNS)?.split(',') ?? [];

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading runs"
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
        createRunRoute={experimentsCreateRunRoute(namespace, experiment.experiment_id)}
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
        <Breadcrumb data-testid="manage-runs-page-breadcrumb">
          <BreadcrumbItem key="experiments">
            <Link to={experimentsBaseRoute(namespace)}>
              Experiments - {getDisplayNameFromK8sResource(project)}
            </Link>
          </BreadcrumbItem>

          <BreadcrumbItem key="experiment">
            {experiment.display_name ? (
              <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
                {/* TODO: Remove the custom className after upgrading to PFv6 */}
                <Truncate content={experiment.display_name} className="truncate-no-min-width" />
              </Link>
            ) : (
              'Loading...'
            )}
          </BreadcrumbItem>

          <BreadcrumbItem key="compare-runs">
            <Link
              to={experimentsCompareRunsRoute(namespace, experiment.experiment_id, selectedRunIds)}
            >
              Compare runs
            </Link>
          </BreadcrumbItem>

          <BreadcrumbItem key="manage-runs">Manage runs</BreadcrumbItem>
        </Breadcrumb>
      }
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <PipelineRunVersionsContextProvider>
        <ManageRunsTable
          runs={runs}
          experiment={experiment}
          filterProps={filterProps}
          onClearFilters={onClearFilters}
          selectedRunIds={selectedRunIds}
          loading={!loaded}
          totalSize={totalSize}
          {...tableProps}
        />
      </PipelineRunVersionsContextProvider>
    </ApplicationsPage>
  );
};

export const ManageRunsPage: React.FC = () => {
  const { experiment } = React.useContext(ExperimentContext);
  return experiment ? <ManageRunsPageInternal experiment={experiment} /> : null;
};
