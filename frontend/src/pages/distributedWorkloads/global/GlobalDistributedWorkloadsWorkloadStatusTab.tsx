import * as React from 'react';
import { Bullseye, PageSection, Spinner, TabContent, TabContentBody } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsTabConfig } from './useDistributedWorkloadsTabs';
import DistributedWorkloadsToolbar from './DistributedWorkloadsToolbar';

type GlobalDistributedWorkloadsWorkloadStatusTabProps = {
  tabConfig: DistributedWorkloadsTabConfig;
};

const GlobalDistributedWorkloadsWorkloadStatusTab: React.FC<
  GlobalDistributedWorkloadsWorkloadStatusTabProps
> = ({ tabConfig }) => {
  const { workloads, workloadCurrentMetrics, workloadTrendMetrics, namespace } = React.useContext(
    DistributedWorkloadsContext,
  );

  const error = workloads.error || workloadCurrentMetrics.error || workloadTrendMetrics.error;
  if (error) {
    return (
      <EmptyStateErrorMessage title="Error loading workload metrics" bodyText={error.message} />
    );
  }

  if (!workloads.loaded || !workloadCurrentMetrics.loaded || !workloadTrendMetrics.loaded) {
    return (
      <PageSection isFilled>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  const { numJobsActive, numJobsFailed, numJobsSucceeded, numJobsInadmissible, numJobsPending } =
    workloadCurrentMetrics.data;

  const { jobsActiveTrend, jobsInadmissibleTrend, jobsPendingTrend } = workloadTrendMetrics.data;

  return (
    <>
      <DistributedWorkloadsToolbar tabConfig={tabConfig} />
      <PageSection isFilled>
        <TabContent
          id={tabConfig.id}
          activeKey={tabConfig.id}
          eventKey={tabConfig.id}
          key={tabConfig.id}
        >
          <TabContentBody>
            <h1>TODO tab content for job metrics -- these are placeholders</h1>
            <br />
            <h1>Workloads matching statuses in project {namespace}:</h1>
            <ul>
              <li>Running: {numJobsActive.data}</li>
              <li>Succeeded: {numJobsSucceeded.data}</li>
              <li>Failed: {numJobsFailed.data}</li>
              <li>Inadmissible: {numJobsInadmissible.data}</li>
              <li>Pending: {numJobsPending.data}</li>
            </ul>
            <br />
            <h1>Workloads for project {namespace}:</h1>
            <pre>{JSON.stringify(workloads.data, undefined, 4)}</pre>
            <br />
            <h1>Active jobs trend:</h1>
            <pre>{JSON.stringify(jobsActiveTrend.data)}</pre>
            <br />
            <h1>Inadmissible jobs trend:</h1>
            <pre>{JSON.stringify(jobsInadmissibleTrend.data)}</pre>
            <br />
            <h1>Pending jobs trend:</h1>
            <pre>{JSON.stringify(jobsPendingTrend.data)}</pre>
            <br />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </>
  );
};
export default GlobalDistributedWorkloadsWorkloadStatusTab;
