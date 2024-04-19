import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

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
  Breadcrumb,
  BreadcrumbItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import { usePipelineActiveRunsTable } from '~/concepts/pipelines/content/tables/pipelineRun/usePipelineRunTable';
import { CompareRunsSearchParam, PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import {
  experimentRunsRoute,
  experimentsBaseRoute,
  experimentsCompareRunsRoute,
  experimentsCreateRunRoute,
} from '~/routes';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useExperimentByParams } from '~/pages/pipelines/global/experiments/useExperimentByParams';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineFilter, {
  FilterOptions,
} from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunTabTitle, PipelineRunType } from '~/pages/pipelines/global/runs';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { ManageRunsTable } from './ManageRunsTable';

interface ManageRunsPageInternalProps {
  experiment: ExperimentKFv2;
}

export const ManageRunsPageInternal: React.FC<ManageRunsPageInternalProps> = ({ experiment }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { namespace, project } = usePipelinesAPI();
  const [[{ items: runs, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    usePipelineActiveRunsTable();
  const filterProps = usePipelineFilter(tableProps.setFilter, {
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
      <EmptyState data-testid="runs-empty-state">
        <EmptyStateHeader
          titleText="No runs"
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
                  pathname: experimentsCreateRunRoute(namespace, experiment.experiment_id),
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
    <ApplicationsPage
      title="Manage runs"
      loaded
      empty={!runs}
      breadcrumb={
        <Breadcrumb data-testid="manage-runs-page-breadcrumb">
          <BreadcrumbItem key="experiments">
            <Link to={experimentsBaseRoute(namespace)}>
              Experiments - {getProjectDisplayName(project)}
            </Link>
          </BreadcrumbItem>

          <BreadcrumbItem key="experiment">
            {experiment.display_name ? (
              <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
                {experiment.display_name}
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
  const experiment = useExperimentByParams();
  return experiment ? <ManageRunsPageInternal experiment={experiment} /> : null;
};
