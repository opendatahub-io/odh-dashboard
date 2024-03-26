import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { PathProps } from '~/concepts/pipelines/content/types';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { CompareRunsInvalidRunCount } from '~/concepts/pipelines/content/compareRuns/CompareRunInvalidRunCount';

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
      loaded={loaded}
      empty={false}
    >
      {/* TODO: CompareRuns page */}
    </ApplicationsPage>
  );
};

export default CompareRunsPage;
