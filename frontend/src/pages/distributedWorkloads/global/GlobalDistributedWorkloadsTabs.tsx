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
import ExternalLink from '#~/components/ExternalLink';
import { useAccessReview } from '#~/api';
import {
  DistributedWorkloadsTabId,
  useDistributedWorkloadsTabs,
} from './useDistributedWorkloadsTabs';

const CLUSTER_QUEUE_DOCS_LINK =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/2.14/html/managing_openshift_ai/managing_distributed_workloads#overview-of-kueue-resources_managing-rhoai';
const PROJECT_QUEUE_DOCS_LINK =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/2.14/html/managing_openshift_ai/managing_distributed_workloads#configuring-distributed-workloads_managing-rhoai';

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
  const [isAdmin] = useAccessReview({
    group: 'kueue.x-k8s.io',
    resource: 'clusterqueues',
    verb: 'create',
  });
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
    const noClusterQueue = !cqExists;
    const title = `Configure the ${noClusterQueue ? 'cluster queue' : 'project queue'}`;

    return (
      <EmptyState headingLevel="h4" icon={WrenchIcon} titleText={title}>
        <EmptyStateBody>
          {noClusterQueue && isAdmin && (
            <>
              Configure the cluster queue to enable distributed workload metrics.{' '}
              <ExternalLink
                text="Learn how to configure cluster queues"
                to={CLUSTER_QUEUE_DOCS_LINK}
              />
            </>
          )}
          {noClusterQueue && !isAdmin && 'Ask your cluster admin to configure the cluster queue.'}
          {!noClusterQueue && (
            <>
              Configure the queue for this project, or select a different project.{' '}
              <ExternalLink
                text="Learn how to configure project queues"
                to={PROJECT_QUEUE_DOCS_LINK}
              />
            </>
          )}
        </EmptyStateBody>
        {noClusterQueue && !isAdmin ? (
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
