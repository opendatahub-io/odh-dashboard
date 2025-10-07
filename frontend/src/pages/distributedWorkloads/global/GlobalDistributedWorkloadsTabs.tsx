import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Tabs,
  Tab,
  TabTitleText,
  PageSection,
  TabContent,
  TabContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import MetricsPageToolbar from '#~/concepts/metrics/MetricsPageToolbar';
import { DistributedWorkloadsContext } from '#~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '#~/components/EmptyStateErrorMessage';
import { LoadingState } from '#~/pages/distributedWorkloads/components/LoadingState';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import {
  DistributedWorkloadsTabId,
  useDistributedWorkloadsTabs,
} from './useDistributedWorkloadsTabs';

type GlobalDistributedWorkloadsTabsProps = {
  activeTabId: DistributedWorkloadsTabId;
};

const GlobalDistributedWorkloadsTabs: React.FC<GlobalDistributedWorkloadsTabsProps> = ({
  activeTabId,
}) => {
  const navigate = useNavigate();
  const tabs = useDistributedWorkloadsTabs();
  const activeTab = tabs.find(({ id }) => id === activeTabId);
  const { namespace } = useParams<{ namespace: string }>();
  const { clusterQueues, localQueues, cqExists } = React.useContext(DistributedWorkloadsContext);
  const requiredFetches = [clusterQueues, localQueues];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return (
      <EmptyStateErrorMessage title="Error loading workload metrics" bodyText={error.message} />
    );
  }

  if (!loaded) {
    return <LoadingState />;
  }

  if (clusterQueues.data.length === 0 || localQueues.data.length === 0) {
    const nonAdmin = !cqExists;
    const title = `Configure the ${!cqExists ? 'cluster queue' : 'project queue'}`;
    const message = nonAdmin
      ? 'Ask your cluster admin to configure the cluster queue.'
      : 'Configure the queue for this project, or select a different project.';

    return (
      <EmptyState headingLevel="h4" icon={WrenchIcon} titleText={title}>
        <EmptyStateBody>{message}</EmptyStateBody>
        {nonAdmin ? (
          <EmptyStateFooter>
            <WhosMyAdministrator />
          </EmptyStateFooter>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <>
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs
          activeKey={activeTabId}
          onSelect={(_, tabId) => {
            const tab = tabs.find(({ id }) => id === tabId);
            if (tab) {
              const namespaceSuffix = namespace ? `/${namespace}` : '';
              navigate(`/observe-monitor/workload-metrics/${tab.path}${namespaceSuffix}`);
            }
          }}
          aria-label="Workload metrics page tabs"
          role="region"
        >
          {tabs
            .filter((tab) => tab.isAvailable)
            .map((tab) => (
              <Tab
                key={tab.id}
                eventKey={tab.id}
                title={<TabTitleText>{tab.title}</TabTitleText>}
                aria-label={`${tab.title} tab`}
                tabContentId={`${tab.id}-tab-content`}
              />
            ))}
        </Tabs>
      </PageSection>
      {activeTab ? <MetricsPageToolbar hasTimeRangeSelect={false} /> : null}
      <PageSection hasBodyWrapper={false} isFilled>
        {tabs
          .filter((tab) => tab.isAvailable)
          .map((tab) => {
            const isActiveTab = tab.id === activeTab?.id;
            return (
              <TabContent
                id={`${tab.id}-tab-content`}
                activeKey={tab.id}
                eventKey={tab.id}
                key={tab.id}
                hidden={!isActiveTab}
              >
                <TabContentBody>{isActiveTab ? <tab.ContentComponent /> : null}</TabContentBody>
              </TabContent>
            );
          })}
      </PageSection>
    </>
  );
};

export default GlobalDistributedWorkloadsTabs;
