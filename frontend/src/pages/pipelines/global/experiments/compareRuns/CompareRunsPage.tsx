import React from 'react';
import { BreadcrumbItem, Stack, StackItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { PathProps } from '#~/concepts/pipelines/content/types';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { CompareRunsInvalidRunCount } from '#~/concepts/pipelines/content/compareRuns/CompareRunInvalidRunCount';

import PipelineContextBreadcrumb from '#~/concepts/pipelines/content/PipelineContextBreadcrumb.tsx';
import CompareRunsRunList from '#~/concepts/pipelines/content/compareRuns/CompareRunsRunList';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { experimentRunsRoute } from '#~/routes/pipelines/experiments';

const CompareRunsPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { runs, loaded } = useCompareRuns();
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();

  if (loaded && (runs.length > 10 || runs.length === 0)) {
    return <CompareRunsInvalidRunCount runs={runs} />;
  }

  return (
    <ApplicationsPage
      data-testid="compare-runs-page"
      breadcrumb={
        <PipelineContextBreadcrumb>
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
          <BreadcrumbItem isActive>Compare runs</BreadcrumbItem>
        </PipelineContextBreadcrumb>
      }
      provideChildrenPadding
      loaded={loaded}
      empty={false}
      noHeader
    >
      <Stack hasGutter>
        <StackItem>
          <CompareRunsRunList />
        </StackItem>

        {/* <StackItem>
          <CompareRunParamsSection />
        </StackItem> */}
      </Stack>
    </ApplicationsPage>
  );
};

export default CompareRunsPage;
