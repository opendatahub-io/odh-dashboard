import React from 'react';
import { Breadcrumb, BreadcrumbItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { PathProps } from '~/concepts/pipelines/content/types';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { CompareRunsInvalidRunCount } from '~/concepts/pipelines/content/compareRuns/CompareRunInvalidRunCount';
import CompareRunsRunList from '~/concepts/pipelines/content/compareRuns/CompareRunsRunList';
import { CompareRunParamsSection } from './CompareRunParamsSection';
import { CompareRunMetricsSection } from './CompareRunsMetricsSection';

const CompareRunsPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { runs, loaded } = useCompareRuns();

  if (loaded && (runs.length > 10 || runs.length === 0)) {
    return <CompareRunsInvalidRunCount runs={runs} />;
  }

  return (
    <ApplicationsPage
      data-testid="compare-runs-page"
      title=""
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>Compare runs</BreadcrumbItem>
        </Breadcrumb>
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

        <StackItem>
          <CompareRunParamsSection />
        </StackItem>

        <StackItem>
          <CompareRunMetricsSection />
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default CompareRunsPage;
