import * as React from 'react';
import { Bullseye, PageSection, Spinner, TabContent, TabContentBody } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsTabConfig } from './useDistributedWorkloadsTabs';
import DistributedWorkloadsToolbar from './DistributedWorkloadsToolbar';

// TODO mturley render a "no data" state when we get undefined back for some metrics - why might we hit this? is there a message we can display about making sure things are configured correctly?

type GlobalDistributedWorkloadsProjectMetricsTabProps = {
  tabConfig: DistributedWorkloadsTabConfig;
};

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC<
  GlobalDistributedWorkloadsProjectMetricsTabProps
> = ({ tabConfig }) => {
  const { projectMetrics, namespace } = React.useContext(DistributedWorkloadsContext);

  if (projectMetrics.error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading workload metrics"
        bodyText={projectMetrics.error.message}
      />
    );
  }

  if (!projectMetrics.loaded) {
    return (
      <PageSection isFilled>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  const { cpuRequested, cpuUtilized } = projectMetrics.data;

  return (
    <>
      <DistributedWorkloadsToolbar tabConfig={tabConfig} />
      <PageSection isFilled>
        <TabContent
          id={`${tabConfig.id}-tab-content`}
          activeKey={tabConfig.id}
          eventKey={tabConfig.id}
          key={tabConfig.id}
        >
          <TabContentBody>
            <h1>TODO tab content for project metrics -- these are placeholders</h1>
            <br />
            <h1>
              CPU requested for project {namespace}: {cpuRequested.data}
            </h1>
            <h1>
              CPU utilized for project {namespace}: {cpuUtilized.data}
            </h1>
          </TabContentBody>
        </TabContent>
      </PageSection>
    </>
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
